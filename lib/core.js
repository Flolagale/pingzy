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
            url: _this.options.slackUrl,
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
            prettyUrl: url.substr(url.indexOf('/') + 2),
            isDown: false,
            lastCheckWasDown: false,
            wentDownAt: null,
            downtimeCount: 0
        };
    });

    var checkWebsites = function () {
        websites.forEach(function (website) {
            logger.info('Checking ' + website.url);
            logger.info(website);

            request({
                url: website.url,
                method: 'GET',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Pingzy'
                }
            }, function (err, response) {
                if (err) {
                    logger.error('Error while checking ' + website.url +
                        '\n' + err.stack);
                }

                var fifteenMinutes = 1000 * 60 * 15;
                if (err || response.statusCode !== 200) {
                    if (!website.lastCheckWasDown) {
                        logger.info('Website ' + website.url + ' seems to be down. Waiting for next check.');
                        website.lastCheckWasDown = true;
                    } else if (!website.isDown) {
                        logger.warn('Website went down: ' + website.url);

                        website.isDown = true;
                        website.wentDownAt = new Date();
                        website.downtimeCount++;

                        postToSlack({
                            fallback: 'Website <' + website.url + '|' + website.prettyUrl + '> just went down at ' + website.wentDownAt,
                            color: 'danger',
                            fields: [{
                                value: 'Website <' + website.url + '|' + website.prettyUrl + '> just went down at ' + website.wentDownAt
                            }],
                            channel: _this.options.slackChannel,
                            username: 'Pingzy',
                            icon_emoji: ':thumbsdown:'
                        });
                    } else if ((Date.now() - website.wentDownAt.getTime()) > fifteenMinutes) {
                        logger.warn('Website is still down: ' + website.url);

                        postToSlack({
                            fallback: 'Website <' + website.url + '|' + website.prettyUrl + '> is still down.',
                            color: 'danger',
                            fields: [{
                                value: 'Website <' + website.url + '|' + website.prettyUrl + '> is still down.'
                            }],
                            channel: _this.options.slackChannel,
                            username: 'Pingzy',
                            icon_emoji: ':thumbsdown:'
                        });
                    }
                } else if (website.isDown) {
                    logger.warn('Website is back up: ' + website.url);

                    website.isDown = false;
                    website.lastCheckWasDown = false;
                    postToSlack({
                        fallback: 'Website <' + website.url + '|' + website.prettyUrl + '> went back online. Good job!',
                        color: 'good',
                        fields: [{
                            value: 'Website <' + website.url + '|' + website.prettyUrl + '> went back online. Good job!',
                        }],
                        channel: _this.options.slackChannel,
                        username: 'Pingzy',
                        icon_emoji: ':thumbsup:'
                    });
                }
            });
        });
    };

    var stringUrls = '';
    this.options.urls.forEach(function (url, index) {
        stringUrls += '<' + url + '|' + url + '>';
        if (index < _this.options.urls.length - 1) {
            stringUrls += ', ';
        }
    });

    var sendSummaryToSlack = function () {
        logger.info('Sending summary.');

        var fields = websites.map(function (website) {
            var value = '';
            if (website.isDown) {
                value = 'Site is *down* since ' + website.wentDownAt;
            } else {
                value = 'Site is currently up and has been down ' + website.downtimeCount + ' times.';
            }

            return {
                title: website.url,
                value: value,
                "short": false
            };
        });

        postToSlack({
            fallback: 'Hi there! Still monitoring urls: ' + stringUrls,
            color: 'good',
            pretext: 'Daily summary:',
            fields: fields,
            channel: _this.options.slackChannel,
            username: 'Pingzy',
            icon_emoji: ':thumbsup:'
        });
    };

    /* Bootstrap. */
    setInterval(checkWebsites, 1000 * 60 * this.options.interval);
    setInterval(sendSummaryToSlack, 1000 * 60 * 60 * 24);

    postToSlack({
        text: 'Starting monitoring urls: ' + stringUrls,
        channel: _this.options.slackChannel,
        username: 'Pingzy',
        icon_emoji: ':thumbsup:'
    });

    checkWebsites();
};

module.exports = new Core();
