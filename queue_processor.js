/* jshint shadow:true */
/* jshint sub:true */

var config = require('./config');

var queueProcessor = function() {
    "use strict";

    var io    = require('socket.io-client');
    var Stomp = require('stomp-client');

    var socket;
    var mq_client;
    var counter      = 0;

    function stop() {
        if (mq_client) {
            mq_client.disconnect(function() {
                console.log("Disconnected from MQ");
            });
        }
        if (socket) {
            socket.emit('disconnect');
        }
        setTimeout(process.exit, 500);
    }


    return {

        start: function() {

            socket      = new io.connect(config.mq.wsServerURL);
            mq_client   = new Stomp(config.mq.mqHost, config.mq.mqPort, config.mq.mqLogin, config.mq.mqPasscode);

            socket.on('stop', function(){
                stop();
            });

            mq_client.connect(function(sessionId) {
                console.log("Connected to MQ: ", sessionId);

                mq_client.subscribe(config.mq.mqName, function(body, headers) {
                    var reading_js = JSON.parse(body);
                    socket.emit('reading', { reading : reading_js});
                    counter++;
                    console.log(counter, body );
                });

            });
        }

    };
    
}().start();
