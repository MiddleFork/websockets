/* jshint shadow:true */
/* jshint sub:true */

var websocketClient = function() {
    "use strict";
	
    var serverURL         = "http://localhost:3700/";
	var socket            = new io.connect(serverURL);
    var subscribedDevices = [];
    var readingCounter    = 0;
    var currentAccount;
	var acct_socket;


    return {
        
        start: function(callbackFn) {
            socket.on('message', function(data){
                if (callbackFn && data.title) {
                    callbackFn(data.title);
                }
            });
        },
        
        
        changeTitle : function(title) {
            if (title && title.length > 0) {
                var newTitle = { title : title };
                console.log("sending: ", title );
                socket.emit('send', newTitle );
            }
            return title;
        },
        
        connectToAccount : function(accountId, callbackFns) {
            
            if (accountId.length > 0 && currentAccount != accountId) {
                if (acct_socket) {
                    console.log("Disconnecting");
                    acct_socket.emit('disconnect');
                    // clear out device list
                    subscribedDevices = [];
                    deviceListCallbackFn([], subscribedDevices);
                }

                acct_socket = io.connect(serverURL + accountId);

                acct_socket.on('connect', function() {
                    currentAccount = accountId;
                    console.log("Connected to ", accountId);
                    if (callbackFns.connect) {
                        callbackFns.connect(currentAccount);
                    }
                });
                
                /* listen for new device lists */
                acct_socket.on('deviceList', function(data) {
                    if (callbackFns.deviceList) {
                        callbackFns.deviceList(data, subscribedDevices);
                    }
                });
                
                /* listen for new readings for subscribed devices */
                acct_socket.on('reading', function(data) {
                    if (callbackFns.reading) {
                        callbackFns.reading(data, readingCounter++);
                    }
                });
                
            }
        },
        
        
        subscribeToDevices : function(deviceList) {
            var message = {};
            if (subscribedDevices.length > 0) {
                var toRemove = subscribedDevices.filter(function(device) {
                    return deviceList.indexOf(device) === -1;
                });
                if (toRemove.length > 0) {
                    message.unsubscribe = toRemove;
                }
            }
            
            if (deviceList.length > 0) {
                message.subscribe = deviceList;
            }

            console.log("sending: ", message );
            acct_socket.emit('send', message );

            subscribedDevices = deviceList;
            return subscribedDevices;
        },

        submitManualReading : function(accountId, deviceId, latitude, longitude, speed, heading) {
            /* auto subscribe to new maunally submitted device readings */
            if (subscribedDevices.indexOf(deviceId) === -1) {
                subscribedDevices.push(deviceId);
                this.subscribeToDevices(subscribedDevices);
            }
            if (accountId && deviceId && latitude && longitude) {
                var newReading = {account: accountId,
                                  id : deviceId,
                                  latitude : latitude,
                                  longitude : longitude,
                                  speed: speed,
                                  heading: heading};
                console.log("sending: ", newReading );
                socket.emit('reading', { reading : newReading});
            }
        }
    };
    
}();
    
