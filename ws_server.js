/* jshint shadow:true */
/* jshint sub:true */

var config = require('./config');

var websocketServer = function() {
    "use strict";

    var express     = require("express");
    var app         = express();
    var defaultPort = config.ws.port;
    var title       = config.ws.greeting;
    var namespaces  = {};
    var deviceLists = {};
    var io;

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
                        console.log("TITLE CHANGE: ", title);
                        socket.broadcast.emit('message', data);
                    }
                    
                    if (data.unsubscribe) {
                        console.log("LEAVE: ", { nsp: nspAccountId, socket: socket.id, devices: data.unsubscribe });
                        for (var u = 0; u < data.unsubscribe.length; u++) {
                            socket.leave(data.unsubscribe[u]);
                        }
                    }
                    
                    if (data.subscribe) {
                        console.log("JOIN:  ", { nsp: nspAccountId, socket: socket.id, devices: data.subscribe });
                        for (var s = 0; s < data.subscribe.length; s++) {
                            socket.join(data.subscribe[s]);
                        }
                    }
                    
                    if (data.reading && data.reading.account && data.reading.id) {
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
        start: function(port = defaultPort) {
            
            app.use(express.static(__dirname + '/public'));
            
            io = require('socket.io').listen(app.listen(port));
            console.log("Listening on port " + port);
            
            /* global namespace */
            io.sockets.on('connection', function (socket) {
                console.log("CONNECT: ", socket.id, socket.request._query);
                socket.emit('message', { title: title });
                
                socket.on('stopWS', function () {
                    io.sockets.emit('stop');
                    console.log("STOPPING in 3 seconds");
                    setTimeout(process.exit, 3000);
                });
                          
                socket.on('send', function (data) {
                              
                    if (data.title) {
                        title = data.title;
                        console.log("TITLE CHANGE: ", title);
                        io.sockets.emit('message', data);
                    }
                    
                });

                /* receive readings on global namespace, but send them to account specific namespaces */
                socket.on('reading', function(data) {
                    if (data.reading && data.reading.account && data.reading.id) {
                        processReading(data.reading);
                    }
                });
            });
            
        }

    };
}().start();
