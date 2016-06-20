/* jshint shadow:true */
/* jshint sub:true */

var websocketClient = function() {
    "use strict";
	
    var serverURL         = "http://localhost:3700/";
	var socket            = new io.connect(serverURL);
	var acct_socket;
    var subscribedDevices = [];
    var counter           = 0;
    var currentAccount;
    
    
    return {
        
        start: function(messageEl) {
            socket.on('message', function(data){
                if (data.title) {
                    messageEl.innerHTML = data.title;
                }
            });
        },
        
        
        changeTitle : function(newTitle, messageEl) {
            if (newTitle.length > 0) {
                var newTitle = { title : title.value };
                messageEl.innerHTML = newTitle;
                console.log("sending: ", newTitle );
                socket.emit('send', newTitle );
            }
        },
        
        connectToAccount : function(accountId, deviceListEl, deviceCountEl, readingTblEl, readingCountEl) {
            
            if (accountId.length > 0) {
                if (acct_socket) {
                    console.log("Disconnecting");
                    /* clear out old account devices */
                    deviceListEl.innerHTML = "";
                    /* clear out old account readings */
                    readingTblEl.innerHTML = "";

                    acct_socket.emit('disconnect');
                }

                acct_socket = io.connect(serverURL + accountId);
                currentAccount = accountId;
                console.log("Connected to ", accountId);
                
                /* listen for new device lists */
                acct_socket.on('deviceList', function(data) {
                    deviceListEl.innerHTML = "";
                    for (var deviceId in data) {
                        var option = document.createElement("option");
                        option.innerHTML = data[deviceId];
                        if (subscribedDevices.indexOf(data[deviceId]) > -1) {
                            option.setAttribute("selected", "selected");
                        }
                        deviceListEl.appendChild(option);
                    }
                    deviceCountEl.innerHTML = data.length;
                });
                
                /* listen for new readings for subscribed devices */
                acct_socket.on('reading', function(data) {
                    if (data.id) {
                        var oldTR = document.getElementById("data-" + data.id);
                        if (oldTR) {
                            oldTR.children[1].innerHTML = data.latitude;
                            oldTR.children[2].innerHTML = data.longitude;
                        } else {
                            var newTR = document.createElement("tr");
                            newTR.setAttribute("id", "data-" + data.id);
                            
                            var idTD   = document.createElement("td");
                            var latTD  = document.createElement("td");
                            var longTD = document.createElement("td");
                            latTD.setAttribute("class", "latitude");
                            longTD.setAttribute("class", "longitude");
                            
                            idTD.innerHTML   = data.id;
                            latTD.innerHTML  = data.latitude;
                            longTD.innerHTML = data.longitude;
                            
                            newTR.appendChild(idTD);
                            newTR.appendChild(latTD);
                            newTR.appendChild(longTD);
                            
                            /* find proper place to insert row (sorted) */
                            var added = false;
                            for (var i = 0; i < readingTblEl.childElementCount; i++) {
                                oldTR = readingTblEl.children[i];
                                if (oldTR.id > newTR.id) {
                                    readingTblEl.insertBefore(newTR, oldTR);
                                    added = true;
                                    break;
                                }
                            }
                            if (!added) {
                                readingTblEl.appendChild(newTR);
                            }
                        }
                        counter++;
                        readingCountEl.innerHTML = counter;
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
                console.log("sending: ", message );
                acct_socket.emit('send', message );
            }
            subscribedDevices = deviceList;
        },

        submitManualReading : function(deviceId, latitude, longitude) {
            /* auto subscribe to new maunally submitted device readings */
            if (subscribedDevices.indexOf(deviceId) === -1) {
                subscribedDevices.push(deviceId);
                this.subscribeToDevices(subscribedDevices);
            }
            if (currentAccount && deviceId && latitude && longitude) {
                var newReading = {account: currentAccount, id : deviceId, latitude : latitude, longitude : longitude };
                console.log("sending: ", newReading );
                acct_socket.emit('send', { reading : newReading});
            }
        }
    };
    
}();
    
