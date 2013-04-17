"use strict";

var _ = require('underscore');
var heka = require('heka');
var os = require('os');
var sys = require('util');
var strftime = require('strftime');

var cef = require('cef');
var raven = require('raven');

var get_heka_client = function (sender) {
    var config = {
        'sender': sender,
        'logger': 'test',
        'severity': 5
    };
    var jsonConfig = JSON.stringify(config);
    var heka_client = heka.clientFromJsonConfig(jsonConfig);
    return heka_client;
}


var get_cef = function(heka_client) {
    var some_func = function(sample) {
        this._capture = sample;
    };

    var cef_log_factory = heka.Adapters.cef_log_factory(heka_client);

    var config = {
        vendor: 'Mozilla',
        product: 'SomeMozApp',
        version: '0.1-baz',
        syslog_tag: 'addons-stage',
        syslog_facility: 'local4',
        log_factory: cef_log_factory,
        err_back: some_func
    };
    return cef.getInstance(config);
}


function test_raven(heka_client) {
    var get_raven = function(dsn, heka_client) {
        var HekaRavenTransport = heka.Adapters.HekaRavenTransport;
        var opt = {transport: new HekaRavenTransport(heka_client)};
        var client = new raven.Client(dsn, opt)
        return client;
    }

    var Foo = function() {
    }

    Foo.prototype.recursive_error = function(counter) {
        var some_number = Math.random();
        if (counter === 0) {
            return new Error("Something bad happened!");
        }
        var result = this.recursive_error(counter-1);
        return result;
    }

    var dsn = "udp://974ae34313ac4560a6eabb2b26f0d567:ffe16afe86ea4245bda99e02d4762e98@localhost:9001/2";
    var client = get_raven(dsn, heka_client);
    var f = new Foo();
    var err = f.recursive_error(50);
    client.captureError(err);
}

var test_cef = function(heka_client) {
    var cef_client = get_cef(heka_client);
    cef_client.info({name: "something wacky", signature: 1234});
}

function main() {

    var stdoutSender = {'factory': './senders:stdoutSenderFactory'};
    var udpSender = {'factory': './senders:udpSenderFactory',
               'hosts': '0.0.0.0',
               'ports': 5565};

    var heka_client = get_heka_client(udpSender);
    //test_cef(heka_client);
    test_raven(heka_client);
};

if (process.argv[1] === __filename) {
  main();
}
