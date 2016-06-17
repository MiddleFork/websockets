var express = require("express");
var app     = express();
var port    = 3700;
var title   = "Welcome to the reading monitor";

app.use(express.static(__dirname + '/public'));

var io = require('socket.io').listen(app.listen(port));
console.log("Listening on port " + port);

io.sockets.on('connection', function (socket) {
    console.log("CONNECT: ", socket.id, socket.request._query);
    socket.emit('message', { title: title });

    socket.on('send', function (data) {

        if (data.title) {
            title = data.title;
            console.log("TITLE CHANGE: ", title);
            io.sockets.emit('message', data);
        }
        
        if (data.unsubscribe) {
            console.log("LEAVE: ", socket.id, data.unsubscribe);
            socket.leave(data.unsubscribe);
        }
        
        if (data.subscribe) {
            console.log("JOIN:  ", socket.id, data.subscribe);
            socket.join(data.subscribe);
        }
        
        if (data.reading && data.reading.account) {
            /* console.log("READING: ", data.reading); */
            io.sockets.in(data.reading.account).emit('reading', data.reading);
        }
    });
});
