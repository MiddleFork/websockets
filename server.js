/* jshint shadow:true */
/* jshint sub:true */

var websocketServer = function() {
    "use strict";

    var express     = require("express");
    var app         = express();
    var defaultPort = 3700;
    var title       = "Welcome to the reading monitor";
    var numAccounts = 5000;
    var namespaces  = {};
    var deviceLists = {};
    

    return {
        start: function(port = defaultPort) {
            
            app.use(express.static(__dirname + '/public'));
            
            var io = require('socket.io').listen(app.listen(port));
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
            });
            
            /* namespace per account */
            /* each device in the account gets a room */
            for (var accountId = 0; accountId < numAccounts; accountId++) {
                var nsp = io.of('/' + accountId);
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
                            /* if this is a device if that is new to the account, add it to the device list */
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

                            /* publish the reading to the room */
                            /* socket.emit('reading', data.reading);  -- if want to send to sender */
                            socket.in(data.reading.id).broadcast.emit('reading', data.reading);
                        }
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
