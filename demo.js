"use strict";

var _ = require('underscore');
var heka = require('heka');
var os = require('os');
var sys = require('util');
var strftime = require('strftime');
var cef = require('cef');

var get_cef = function(heka_client) {
    var some_func = function(sample) {
        this._capture = sample;
    };

    var custom_factory = function(syslog_config) {
        var requiredHekaSyslogOptions = ['syslog_options',
                                         'syslog_facility',
                                         'syslog_ident',
                                         'syslog_priority'];
        var self = this;

        // Bind in the syslog configuration
        self._syslog_config = {};
        // The only syslog options we really care about are the
        // ident and facility fields
        self._syslog_config['syslog_ident'] = syslog_config.tag || "node_cef";
        self._syslog_config['syslog_facility'] = syslog_config.facility|| "local4";
        self._syslog_config['syslog_priority'] = "";
        self._syslog_config['syslog_options'] = "";


        // A replacement object for syslog which transports over
        // heka instead
        var heka_not_syslog = {
            heka_transport: function(){
                return heka_client;
            },
            log: function(message, severity) {
                this._transport_capture_msg = message;
                this._transport_capture_severity = severity;

                var timestamp = new Date();
                var hostname = os.hostname();

                message = strftime.strftimeUTC("%b %d %H:%M:%S", timestamp) + " " + hostname + " " + message;

                var heka_cef_opts = {fields: {cef_meta: self._syslog_config},
                                     payload: message,
                                     timestamp: timestamp,
                                     severity: severity};
                this.heka_transport().heka('cef', heka_cef_opts);
            },
            syslog_config: function() {
                /*
                 * This provides access to the identity tag and the facility level
                 */
                return self._syslog_config;
            }
        }
        return heka_not_syslog;
    };

    var config = {
        vendor: 'Mozilla',
        product: 'SomeMozApp',
        version: '0.1-baz',
        syslog_tag: 'addons-stage',
        syslog_facility: 'local4',
        log_factory: custom_factory,
        err_back: some_func
    };
    return cef.getInstance(config);
}

function main() {
    var config = {
        'sender': {'factory': './senders:stdoutSenderFactory'},
        'logger': 'test',
        'severity': 5
    };
    var jsonConfig = JSON.stringify(config);
    var heka_client = heka.clientFromJsonConfig(jsonConfig);

    var cef_client = get_cef(heka_client);
    cef_client.info({name: "something wacky",
                     signature: 1234});
};



if (process.argv[1] === __filename) {
  main();
}
