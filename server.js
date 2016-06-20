/* jshint shadow:true */
/* jshint sub:true */

var websocketServer = function() {
    "use strict";

    var express     = require("express");
    var app         = express();
    var defaultPort = 3700;
    var title       = "Welcome to the reading monitor";
    var numAccounts = 5;
    var namespaces  = {};
    var deviceLists = {};
    var io;

    function getNamespaceForAccount(accountId) {
        var nsp = namespaces[accountId];
        if (! nsp) {
            nsp = io.of('/' + accountId);
            namespaces[accountId] = nsp;
            console.log("Creating namespace connection for ", accountId);
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
            
            /* namespace per account */
            /* each device in the account gets a room */
            for (var accountId = 0; accountId < numAccounts; accountId++) {
                var nsp = getNamespaceForAccount(accountId);
                
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

                        /*
                        if (data.reading && data.reading.account && data.reading.id) {
                            /* if this is a device if that is new to the account, add it to the device list 
                            if (data.reading.account in deviceLists) {
                                if (deviceLists[data.reading.account].indexOf( data.reading.id )  === -1 ) {
                                    deviceLists[data.reading.account].push(data.reading.id);
                                    deviceLists[data.reading.account].sort();
                                    socket.emit('deviceList', deviceLists[data.reading.account]);
                                    socket.broadcast.emit('deviceList', deviceLists[data.reading.account]);
                                }
                            } else {
                                deviceLists[data.reading.account] = [ data.reading.id ];
                                socket.emit('deviceList', deviceLists[data.reading.account]);
                                socket.broadcast.emit('deviceList', deviceLists[data.reading.account]);
                            }

                            /* socket.emit('reading', data.reading);  -- if want to send to sender 
                            socket.in(data.reading.id).broadcast.emit('reading', data.reading);
                            }
                        */
                    });
                    
                    socket.on('disconnect', function() {
                        console.log("DISCONNECT: ", { nsp: nspAccountId, socket: socket.id});
                        socket.disconnect();
                    });
                    
                });
                
            }
            
        }
    };
}().start();
