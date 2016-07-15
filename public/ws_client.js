/* jshint shadow:true */
/* jshint sub:true */
importScripts("socket.io.js");


var websocketClient = function() {
    "use strict";
	
    var serverURL         = "http://localhost:" + location.port + "/";
	var socket            = new io.connect(serverURL);
    var subscribedDevices = [];
    var readingCounter    = 0;
    var currentAccount;
	var acct_socket;


    return {
        
        start: function(callbackFn) {
            socket.on('message', function(data){
                console.log("START:" + JSON.stringify(data));
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
                    this.subscribeToDevices([]);
                    callbackFns.deviceList([], subscribedDevices);
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

self.addEventListener('message', function(e) {
    var data = e.data;
    console.log("WORKER:" + JSON.stringify(data));
    switch (data.cmd) {
    case 'start':
        //websocketClient = websocketClient(data.url);
        websocketClient.start(function(title) {self.postMessage({cmd: 'title', title: title});});
        break;
    case 'changeTitle':
        websocketClient.changeTitle(data.title);
        self.postMessage({cmd: 'title', title: data.title});
        break;
    case 'connectToAccount':
        websocketClient.connectToAccount(data.accountId, {
            connect    : function(accountId) {
                self.postMessage({
                    cmd: 'connected',
                    accountId: accountId
                });},
            deviceList : function(deviceList, subscribedDevices) {
                self.postMessage({
                    cmd: 'deviceList',
                    deviceList: deviceList,
                    subscribedDevices : subscribedDevices
                });},
            reading    : function(device, counter) {
                self.postMessage({
                    cmd: 'updateDevice',
                    device: device,
                    counter : counter
                });}
        });
        break;
    case 'subscribeToDevices':
        var subscribedCount = websocketClient.subscribeToDevices(data.devices).length;
        self.postMessage({
            cmd: 'subscribedCount',
            subscribedCount: subscribedCount
        });

        break;
    }
}, false);
        
        
