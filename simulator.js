var io = require('socket.io-client');
var fs = require('fs');

// file is included here:
eval(fs.readFileSync('public/simulator.js')+'');

simulator.start();
