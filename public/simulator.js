/* jshint shadow:true */
/* jshint sub:true */


var simulator = function() {
    "use strict";

    var serverURL            = "http://localhost:" + document.location.port + "/";
    var socket               =  new io.connect(serverURL);

	var sockets              = {};
    var numAccounts          = 10;
    var numDevicesPerAccount = 100;
    var intervalId;
    var counter              = 0;
    var _batchSize           = 100;
    var _intervalDelay       = 1000;
    var _button;
    var _status;
    var _message;
    var devices = {};

    function inUSA(lat, lng) {
        var inState = false;
        if (typeof statePolys !== "undefined") {
            console.log("checking: " + lat, lng);
            var latLng = new google.maps.LatLng(lat, lng);
            var states = Object.keys(statePolys);
            for (var s = 0; s < states.length; s++) {
                if (google.maps.geometry.poly.containsLocation(latLng, statePolys[states[s]])) {
                    inState = true;
                    break;
                }
            }
        } else {
            inState = true;
        }
        return inState;
    }

    
    /* function to calculate a new latitude and longitude based on direction and speed 
       from: http://www.etechpulse.com/2014/02/calculate-latitude-and-longitude-based.html */
    function computeNewLatLng(currentLatitude, currentLongitude, currentHeading, speed) {
        var vNewLatLng = [];
        // convert speed from mph to kph, then assume 1 minute duration, then divide by earth radius in km
        var distance = (speed / 1.609344 / 60) / 6371;
        currentHeading = ToRad(currentHeading);
        
        var vLat1 = ToRad(currentLatitude);
        var vLng1 = ToRad(currentLongitude);
        
        var vNewLat = Math.asin(Math.sin(vLat1) * Math.cos(distance) +
                                Math.cos(vLat1) * Math.sin(distance) * Math.cos(currentHeading));
        
        var vNewLng = vLng1 + Math.atan2(Math.sin(currentHeading) * Math.sin(distance) * Math.cos(vLat1),
                                         Math.cos(distance) - Math.sin(vLat1) * Math.sin(vNewLat));
        
        if (isNaN(vNewLat) || isNaN(vNewLng)) {
            return null;
        }
        
        vNewLatLng[0] = ToDeg(vNewLat);
        vNewLatLng[1] = ToDeg(vNewLng);

        return vNewLatLng;
    }

    function ToRad(vInput) {
        return vInput * Math.PI / 180;
    }
    
    function ToDeg(vInput) {
        return vInput * 180 / Math.PI;
    }
    
    function sendReading(accountId) {
        var deviceId = accountId + (("0000000000" + Math.round(Math.random() * (numDevicesPerAccount - 1))).slice(-10 + accountId.toString().length));
        if (devices[deviceId] === undefined) {
            /* for a new device, generate a random location in the general confines of the contiguous USA
               which is between: 
               +48.987386 is the northern most latitude 
               +24.555059 is the southern most latitude 
               -124.626080 is the west most longitude 
               -62.361014 is a east most longitude 
               or
               latitude : 24.5 + (Math.random() * 24.4), 
               longitude : -62 - (Math.random() * 62),

               full world range would be: +/- 90 for latitude and longitude
               latitude : (Math.random() * 180) - 90,
               longitude : (Math.random() * 180) - 90,
            */

            var isInUSA = false;
            var lat, lng;
            while (!isInUSA) {
                lat =  24.5 + (Math.random() * 24.4);
                lng =  -62 - (Math.random() * 62);
                isInUSA = inUSA(lat, lng);
            }
            
            var newReading = {account : accountId,
                              id : deviceId,
                              latitude : lat,
                              longitude : lng,
                              speed: (Math.random() * 4023 * 0.0223693629).toFixed(1), /* up to 90 mph */
                              heading: (Math.random() * 360).toFixed(1)};
            devices[deviceId] = newReading;
        } else {
            /* for an existing device, compute a readonable delta
               location from the current location based on speed and
               heading */
            var newLatLng =  computeNewLatLng(devices[deviceId].latitude,
                                              devices[deviceId].longitude,
                                              devices[deviceId].heading,
                                              devices[deviceId].speed);
            if (newLatLng !== null) {
                devices[deviceId].latitude  = newLatLng[0];
                devices[deviceId].longitude = newLatLng[1];
                devices[deviceId].speed     = (Math.random() * 4023 * 0.0223693629).toFixed(1); /* up to 90 mph */
                devices[deviceId].heading   = (Math.random() * 360).toFixed(1);
            } else {
                devices[deviceId].speed = 0;
            }                
        }
                
        socket.emit('reading', { reading : devices[deviceId]});
        counter++;
        if (_message) {
            _message.innerHTML = counter + " : " + JSON.stringify(devices[deviceId]);
        } else {
            process.stdout.write("Readings send: " + counter + "\r" );
        }
        
    }
    
    function sendBatchOf(size) {
        for (var i = 0; i < size; i++) {
            var randomAccount = Math.round(Math.random() * (numAccounts - 1));
            sendReading(randomAccount);
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

            console.log("Starting simulation sending " + batchSize + " readings every " + intervalDelay + " milliseconds to " + numAccounts + " accounts");
            
            /* open socket for each account */
            /*
            for (var accountId = 0; accountId < numAccounts; accountId++) {
                sockets[accountId] = io.connect(serverURL + accountId);
            }
            */
            
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
            console.log("Simulation stopped.");
            
            /* close socket for each account */
            /*
            for (var accountId = 0; accountId < numAccounts; accountId++) {
                sockets[accountId].emit('disconnect');
            }
            */

            if (_status) {
                _status.innerHTML = "Stopped.";
            }
            if (_button) {
                _button.value = "Start";
                _button.setAttribute("class", "start");
                _button.onclick = function() {simulator.start();};
            }
            
        },
        
        oneTime : function(accountId) {
            sendReading(accountId);
        }

    };
}();

