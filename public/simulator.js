/* jshint shadow:true */
/* jshint sub:true */


var simulator = function() {
    "use strict";

    var serverURL            = "http://localhost:3700/";
	var sockets              = {};
    var numAccounts          = 50;
    var numDevicesPerAccount = 100;
    var intervalId;
    var counter              = 0;
    var _batchSize           = 100;
    var _intervalDelay       = 100;
    var _button;
    var _status;
    var _message;

    function sendBatchOf(size) {
        for (var i = 0; i < size; i++) {
            var randomAccount = Math.round(Math.random() * (numAccounts - 1));
            var newReading    = {account : randomAccount,
                                 id : randomAccount + (("0000000000" + Math.round(Math.random() * (numDevicesPerAccount - 1))).slice(-10 + randomAccount.toString().length)),
                                 latitude : (Math.random() * 360) - 180,
                                 longitude : (Math.random() * 180) - 90 };
            sockets[randomAccount].emit('send', { reading : newReading});
            counter++;
            if (_message) {
                _message.innerHTML = counter + " : " + JSON.stringify(newReading);
            } else {
                console.log(counter, " : ", newReading );
            }

            /*
            console.log("sending: ", newReading );
            var p = document.createElement('p');
            p.innerHTML = JSON.stringify(newReading);
            log.appendChild(p);
            */
        }
    }


    return {
        
        start : function(batchSize = _batchSize,
                         intervalDelay = _intervalDelay,
                         buttonEl = _button,
                         statusEl = _status,
                         messageEl = _message) {
            _batchSize     = batchSize;
            _intervalDelay = intervalDelay;
            _message       = messageEl;
            _status        = statusEl;
            _button        = buttonEl;
            
            /* open socket for each account */
            for (var accountId = 0; accountId < numAccounts; accountId++) {
                sockets[accountId] = io.connect(serverURL + accountId);
            }
            
            intervalId = setInterval(function() { sendBatchOf(_batchSize); }, _intervalDelay);

            if (_status) {
                _status.innerHTML = "Sending...";
            }
            if (_button) {
                _button.value = "Stop";
                _button.setAttribute("class", "stop");
                _button.onclick = simulator.stop;
            }
        },

        stop : function() {
            clearInterval(intervalId);

            /* close socket for each account */
            for (var accountId = 0; accountId < numAccounts; accountId++) {
                sockets[accountId].emit('disconnect');
            }

            if (_status) {
                _status.innerHTML = "Stopped.";
            }
            if (_button) {
                _button.value = "Start";
                _button.setAttribute("class", "start");
                _button.onclick = function() {simulator.start();};
            }
            
        }
    };
}();

