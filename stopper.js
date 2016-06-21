/* jshint shadow:true */
/* jshint sub:true */

var config = require('./config');
var io     = require('socket.io-client');

socket  = new io.connect(config.mq.wsServerURL);
socket.emit('stopWS');
setTimeout(process.exit, 1000);


