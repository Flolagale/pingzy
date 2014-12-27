#!/usr/bin/env node
'use strict';

var forever = require('forever-monitor');
var logger = require('./lib/logger');
var path = require('path');

var pkg = require('./package.json');

var cliProcess = new (forever.Monitor)(path.join(__dirname, 'cli.js'), {
    max: 1000,
    minUptime: 10000,
    options: process.argv.slice(2)
});

cliProcess.on('error', function (err) {
    logger.error('Error caused ' + pkg.name + ' to crash.');
    logger.error('Please report this to ' + pkg.bugs.url);
    logger.error(err);
    logger.info();
    logger.info();
});

cliProcess.on('restart', function () {
    logger.warn('It is likely that an error caused ' + pkg.name + ' to crash.');
    logger.warn('Please report this to ' + pkg.bugs.url);
    logger.warn(pkg.name + ' restarted.');
    logger.info();
    logger.info();
});

cliProcess.on('exit', function () {
    logger.info(pkg.name + ' stopped.');
});

cliProcess.start();
