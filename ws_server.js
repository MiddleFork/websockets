/* jshint shadow:true */
/* jshint sub:true */

var config = require('./config');

var websocketServer = function() {
    "use strict";

    var express       = require("express");
    var app           = express();
    var title         = config.ws.greeting;
    var namespaces    = {};
    var deviceLists   = {};
    var io;
    var child_process = require("child_process");

    function hasAccountForReading(reading) {
        var accountId = Number.parseInt(reading.account);
        var nsp = namespaces[accountId];
        return (typeof nsp != "undefined");
    }
    
    function getNamespaceForAccount(accountId) {
        var nsp = namespaces[accountId];

        /* if this is the first occurence of this account, create a new namespace for it */
        if (! nsp) {
            nsp = io.of('/' + accountId);
            namespaces[accountId] = nsp;
            console.log("Creating namespace connection for ", accountId);
            
            nsp.on('connection', function (socket) {
                var nspAccountId = socket.nsp.name.replace( /^\D+/g, '');
                console.log("CONNECT: ", { nsp: nspAccountId, socket: socket.id});

                /* publish the current device list to new clients */
                if (deviceLists[nspAccountId]) {
                    socket.emit('deviceList', deviceLists[nspAccountId]);
                } else {
                    socket.emit('deviceList', []);
                }
                
                socket.on('send', function (data) {
                    
                    if (data.title) {
                        title = data.title;
                        console.log("NSP TITLE CHANGE: ", title);
                        socket.broadcast.emit('message', data);
                    }
                    
                    if (data.unsubscribe) {
                        console.log("LEAVE: ", { nsp: nspAccountId, socket: socket.id, devices: data.unsubscribe });
                        for (var u = 0; u < data.unsubscribe.length; u++) {
                            socket.leave(data.unsubscribe[u]);
                        }
                        socket.emit('deviceList', deviceLists[nspAccountId]);

                    }
                    
                    if (data.subscribe) {
                        console.log("JOIN:  ", { nsp: nspAccountId, socket: socket.id, devices: data.subscribe });
                        for (var s = 0; s < data.subscribe.length; s++) {
                            socket.join(data.subscribe[s]);
                        }
                    }
                    
                    if (data.reading) {
                        processReading(data.reading);
                    }
                    
                });
                
                socket.on('disconnect', function() {
                    console.log("DISCONNECT: ", { nsp: nspAccountId, socket: socket.id});
                    socket.disconnect();
                });
                
            });

            console.log("Total namespaces: ", Object.keys(namespaces).length);
        }
        
        return nsp;
    }
    
    function processReading(reading) {
        var accountId = Number.parseInt(reading.account);
        var nsp = getNamespaceForAccount(accountId);

        /* if this is a device if that is new to the account, add it to the device list */
        if (reading.account in deviceLists) {
            if (deviceLists[reading.account].indexOf( reading.id )  === -1 ) {
                deviceLists[reading.account].push(reading.id);
                deviceLists[reading.account].sort();
                nsp.emit('deviceList', deviceLists[reading.account]);
            }
        } else {
            deviceLists[reading.account] = [ reading.id ];
            nsp.emit('deviceList', deviceLists[reading.account]);
        }
        
        /* publish the reading to the device specific room */
        nsp.in(reading.id).emit('reading', reading);
        
    }

    return {
        start: function(port, attachQueue, useRedis) {
            if (typeof port == "undefined") {
                console.log("Usage: node ws_server [port [attachQueue [useRedis]]]");
                console.log("No port specified.");
                console.log("Please provide a port as a command line argument or in config.js");
                process.exit();
            }

            app.use(express.static(__dirname + '/public'));
            
            io = require('socket.io').listen(app.listen(port));
            console.log("Listening on port " + port);

            // start up the queue processor
            if (attachQueue === true) {
                child_process.fork(__dirname + "/queue_processor");
            }

            // load balance with redis
            if (useRedis === true) {
                console.log("Adding Redis adapter on port " + config.redis.port);
                var io_redis      = require('socket.io-redis');
                var redis_adapter = io_redis({ host: config.redis.host, port: config.redis.port });
                redis_adapter.pubClient.on('error', function(err){console.log("Redis " + err);});
                redis_adapter.subClient.on('error', function(err){console.log("Redis " + err);});
                io.adapter(redis_adapter);
            }
            
            /* global namespace */
            io.sockets.on('connection', function (socket) {
                console.log("CONNECT: ", socket.id, socket.request._query);
                console.log("INITIAL TITLE: ", title);
                socket.emit('message', { title: title });
                
                socket.on('stopWS', function () {
                    io.sockets.emit('stop');
                    console.log("STOPPING in 3 seconds");
                    setTimeout(process.exit, 3000);
                });
                          
                socket.on('send', function (data) {
                              
                    if (data.title) {
                        title = data.title;
                        console.log("GLOBAL TITLE CHANGE: ", title);
                        io.sockets.emit('message', data);
                    }
                    
                });

                /* receive readings on global namespace, but send them to account specific namespaces */
                socket.on('reading', function(data) {
                    if (data.reading) {
                        processReading(data.reading);
                    }
                });

            });
            
        }

    };
}();

/*
 * show command line arguements
process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
});
*/

var nodejspath  = process.argv.shift();
var scriptpath  = process.argv.shift();
var port        = process.argv.shift() || config.ws.port;
var attachQueue = (process.argv.shift() == "true") || (config.ws.attachQueue == "true") || false;
var useRedis    = (process.argv.shift() == "true") || (config.ws.useRedis == "true") || false;

websocketServer.start(port, attachQueue, useRedis);
