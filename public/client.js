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
    var _map;
    var markers = {};
    

    function markDevice(id, latitude, longitude) {
        var marker = markers[id];
        if (marker) {
            marker.setPosition( new google.maps.LatLng(latitude, longitude) );
        } else {
            var location = new google.maps.LatLng(latitude, longitude);
            marker = new google.maps.Marker({
                position: location,
                map: _map
            });
            markers[id] = marker;
        }
    }


    return {
        
        start: function(messageEl, map) {
            _map = map;
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
            
            if (accountId.length > 0 && currentAccount != accountId) {
                if (acct_socket) {
                    console.log("Disconnecting");
                    /* clear out old account devices */
                    deviceListEl.innerHTML = "";
                    subscribedDevices      = [];
                    /* clear out old account readings */
                    readingTblEl.innerHTML = "";

                    acct_socket.emit('disconnect');
                }

                acct_socket = io.connect(serverURL + accountId);

                acct_socket.on('connect', function() {
                    currentAccount    = accountId;
                    console.log("Connected to ", accountId);
                });
                
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
                            oldTR.children[3].innerHTML = data.speed;
                            oldTR.children[4].innerHTML = data.heading;
                        } else {
                            var newTR = document.createElement("tr");
                            newTR.setAttribute("id", "data-" + data.id);
                            
                            var idTD   = document.createElement("td");
                            var latTD  = document.createElement("td");
                            var longTD = document.createElement("td");
                            var speedTD  = document.createElement("td");
                            var headingTD = document.createElement("td");
                            latTD.setAttribute("class", "latitude");
                            longTD.setAttribute("class", "longitude");
                            speedTD.setAttribute("class", "speed");
                            headingTD.setAttribute("class", "heading");
                            
                            idTD.innerHTML   = data.id;
                            latTD.innerHTML  = data.latitude;
                            longTD.innerHTML = data.longitude;
                            speedTD.innerHTML  = data.speed;
                            headingTD.innerHTML = data.heading;
                            
                            newTR.appendChild(idTD);
                            newTR.appendChild(latTD);
                            newTR.appendChild(longTD);
                            newTR.appendChild(speedTD);
                            newTR.appendChild(headingTD);
                            
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
                        markDevice(data.id, data.latitude, data.longitude);

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
    
