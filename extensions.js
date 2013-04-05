var util = require('util');
var heka = require('heka');

var transports = require('raven').transports;

// Note that the factory configuration is a relative path
// from *within* heka-node as require in javascript it always going to
// be relative to the file that include the 'require' statement.

var HEKA_CONF = {
    'sender': {'factory': './senders:udpSenderFactory',
               'hosts': '0.0.0.0',
               'ports': 5565},
    'logger': 'test',
    'severity': 5
};

var jsonConfig = JSON.stringify(HEKA_CONF);
var logger = heka.clientFromJsonConfig(jsonConfig);
console.log(logger);

function HekaTransport() {
    this.protocol = 'heka+udp' 

    // Just a hardcoded heka-node instance, customize as necessary
    this.logger = logger;
}

var Transport = transports.Transport;
util.inherits(HekaTransport, Transport);

HekaTransport.prototype.send = function(client, message, headers) {
    message = headers['X-Sentry-Auth'] + '\n\n'+ message;

    var self = client;
    opts = {}
    opts.logger = 'some_logger';
    opts.payload = message;
    opts.fields = {'epoch_timestamp': new Date().getTime(),
                   'dsn': 'some_dsn_goes_here'}

    self.logger.heka('sentry', opts)
}

exports.heka_transport = new HekaTransport();
