#!/usr/bin/env node
'use strict';

var logger = require('./lib/logger');
var program = require('commander');

/* Here come the core module of your command line app. Change this to something
 * that really suit your needs. */
var core = require('./lib/core');

var pkg = require('./package.json');

var parseList = function (val) {
    return val.split(',');
};

program.version(pkg.version)
    .option('-u, --urls <items>', 'The urls to monitor separated by commas without spaces. (http://mysite.com,https://my.othersite.com', parseList)
    .option('-d, --slack-domain [Slack domain]', 'Your Slack domain as in http://domain.slack.com.')
    .option('-s, --slack-url [Slack webhook url]', 'The Slack webhook url of your webhook integration.')
    .option('-c, --slack-channel [Slack channel]', 'The Slack channel to post to. Default to #general.')
    .option('-i, --interval <n>', 'The interval in minutes between each check of the urls. Default to 1 minute.', parseInt)
    .option('-l, --log-file [file path]', "The log file path. Default to './.tmp/" + pkg.name + ".log'.")
    .option('--verbose', 'Set the logging level to verbose.');

/* Hack the argv object so that commander thinks that this script is called
 * 'pkg.name'. The help info will look nicer. */
process.argv[1] = pkg.name;
program.parse(process.argv);

logger.info(pkg.name + ' v' + pkg.version);

if (!program.urls || program.urls.length === 0) {
    console.log('Provide at least 1 url to monitor.');
    process.exit(0);
}

if (!program.slackDomain) {
    console.log('Provide a Slack domain.');
    process.exit(0);
}

if (!program.slackUrl) {
    console.log('Provide a Slack webhook url.');
    process.exit(0);
}

if (!program.slackChannel) {
    console.log('Provide a Slack channel.');
    process.exit(0);
}

core.start({
    urls: program.urls,
    slackDomain: program.slackDomain,
    slackUrl: program.slackUrl,
    slackChannel: program.slackChannel || '#general',
    interval: program.interval || 1,
    logFile: program.logFile || './.tmp/' + pkg.name + '.log',
    verbose: program.verbose,
}, function (err) {
    if (err) process.exit(1);

    if (core.options.logFile) logger.info('Log file: ' + core.options.logFile);
});
