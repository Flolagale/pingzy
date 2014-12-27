/* jshint expr: true */
'use strict';

var core = require('../lib/core');
var request = require('request');

var should = null;
should = require('should');

before(function (done) {
    core.start({
        port: 3000,
        verbose: true
    }, function (err) {
        should.not.exist(err);
        done();
    });
});

describe('The core module', function () {
    it('should respond "Hello World" to any incoming request', function (done) {
        this.timeout(3000);

        request.get('http://localhost:3000/hello', function (err, resp, body) {
            if (err) console.log(err);
            should.not.exist(err);

            resp.statusCode.should.eql(200);
            body.should.eql('Hello World\n');
            done();
        });
    });
});
