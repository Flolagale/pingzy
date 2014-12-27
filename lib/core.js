'use strict';

var _ = require('lodash');
var events = require('events');
var fs = require('fs');
var request = require('request');
var shell = require('shelljs');
var util = require('util');

var logger = require('./logger');

var Core = function () {
    events.EventEmitter.call(this);

    /* Set up the default options. */
    this.options = {
        tmp: '.tmp',
        logFile: null,
        verbose: false,
    };
};
util.inherits(Core, events.EventEmitter);

Core.prototype.start = function (options, callback) {
    debugger;
    var _this = this;

    options = options || {};
    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    this.options = _.defaults(options, this.options);

    callback = callback || function () {};

    /* Create tmp dir if necessary. */
    if (!fs.existsSync(this.options.tmp)) {
        shell.mkdir('-p', this.options.tmp);
    }

    /* Log to a file if necessary. */
    if (this.options.logFile) {
        logger.setLogFile(this.options.logFile);
    }

    /* Set log level if necessary. */
    if (this.options.verbose) {
        logger.setLevel('verbose');
        logger.info('Log level set to verbose.');
    }

    var postToSlack = function (data) {
        request({
            url: _this.options.slackToken,
            method: 'POST',
            body: JSON.stringify(data)
        }, function (err, response) {
            if (err || response.statusCode !== 200) {
                err = err || new Error('Unable to post to slack.\n' + response.body);
                logger.error(err.stack);
            }
        });
    };

    var websites = this.options.urls.map(function (url) {
        return {
            url: url,
            isDown: false,
            wentDownAt: null,
            downtimeCount: 0
        };
    });

    var checkWebsites = function () {
            debugger;
        websites.forEach(function (website) {
            debugger;
            logger.info('Checking ' + website.url);
            logger.info(website);

            request({
                url: website.url,
                method: 'GET',
                timeout: 5000,
                headers: {
                    'User-Agent': 'Pingzy'
                }
            }, function (err, response) {
                debugger;
                if (err) {
                    logger.error('Error while checking ' + website.url +
                        '\n' + err.stack);
                }

                var fifteenMinutes = 1000 * 60 * 15;
                var prettyUrl = website.url.substr(website.url.indexOf('/') + 2);
                if (err || response.statusCode !== 200) {
                    if (!website.isDown) {
                        logger.warn('Website went down: ' + website.url);

                        website.isDown = true;
                        website.wentDownAt = new Date();
                        website.downtimeCount++;

                        postToSlack({
                            fallback: 'Website <' + website.url + '|' + prettyUrl + '> just went down at ' + website.wentDownAt,
                            color: 'danger',
                            fields: [{
                                value: 'Website <' + website.url + '|' + prettyUrl + '> just went down at ' + website.wentDownAt
                            }],
                            channel: _this.options.slackChannel,
                            username: 'Pingzy',
                            icon_emoji: ':thumbsdown:'
                        });
                    } else if ((Date.now() - website.wentDownAt.getTime()) > fifteenMinutes) {
                        logger.warn('Website is still down: ' + website.url);

                        postToSlack({
                            fallback: 'Website <' + website.url + '|' + prettyUrl + '> is still down.',
                            color: 'danger',
                            fields: [{
                                value: 'Website <' + website.url + '|' + prettyUrl + '> is still down.'
                            }],
                            channel: _this.options.slackChannel,
                            username: 'Pingzy',
                            icon_emoji: ':thumbsdown:'
                        });
                    }
                } else if (website.isDown) {
                    logger.warn('Website is back up: ' + website.url);

                    website.isDown = false;
                    postToSlack({
                        fallback: 'Website <' + website.url + '|' + prettyUrl + '> went back online. Good job!',
                        color: 'good',
                        fields: [{
                            value: 'Website <' + website.url + '|' + prettyUrl + '> went back online. Good job!',
                        }],
                        channel: _this.options.slackChannel,
                        username: 'Pingzy',
                        icon_emoji: ':thumbsup:'
                    });
                }
            });
        });
    };

    // setInterval(checkWebsites, 1000 * 60 * this.options.interval);
    setInterval(checkWebsites, 1000 * 5);

    var stringUrls = '';
    this.options.urls.forEach(function (url, index) {
        stringUrls += '<' + url + '|' + url + '>';
        if (index < _this.options.urls.length - 1) {
            stringUrls += ', ';
        }
    });

    postToSlack({
        text: 'Starting monitoring urls: ' + stringUrls,
        channel: _this.options.slackChannel,
        username: 'Pingzy',
        icon_emoji: ':thumbsup:'
    });

    checkWebsites();
};

module.exports = new Core();
