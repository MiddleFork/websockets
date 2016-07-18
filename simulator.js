var io         = require('socket.io-client');
var fs         = require('fs');
var geolib     = require('geolib');

var nodejspath = process.argv.shift();
var scriptpath = process.argv.shift();
var port       = process.argv.shift() || "3700";

var location   = {hostname: "localhost", port: port};

// file is included here:
eval(fs.readFileSync('public/states.js')+'');
eval(fs.readFileSync('public/simulator.js')+'');

simulator.start(200);
//simulator.oneTime(1);

