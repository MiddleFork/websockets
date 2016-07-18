/* jshint shadow:true */
/* jshint sub:true */

var deviceMap = function() {
    /* use strict */

    var mapOptions = {
        zoom: 4,
        center: new google.maps.LatLng(40.8191, -96.710716),  //approx center of US
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    
    var map                = new google.maps.Map(document.getElementById("map"), mapOptions);
    var markers            = {};
    var earthRadiusKM      = 6371.008; // Radius of the earth in km (http://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html)
    // this is the maximum distance in KM that will be allowed to render in a transition.
    // anything beyond this will simply my moved.
    var maxDistanceToTrans = 5;


    if (typeof Worker != "undefined") {
        console.log("Using Web Worker Transitions");
        var transitionCallbacks = {};
        // start up the deviceTransitions as a separate web worker
        var deviceTransitions = new Worker("ww_device_transitions.js");
        deviceTransitions.addEventListener('message', function(e) {
            var data = e.data;
            switch (data.cmd) {
            case 'moveMarker':
                var marker = markers[data.markerId];
                if (marker) {
                    var latlng = new google.maps.LatLng(data.latLng.latitude, data.latLng.longitude);
                    marker.setPosition(latlng);
                }
                break;
            case 'transitioned':
                var callbackFn = transitionCallbacks[data.markerId];
                if (typeof callbackFn == "function") {
                    callbackFn();
                    delete transitionCallbacks[data.markerId];
                }
                break;
            }
        });
    }
    
    /*
     * setup a transition (animation) of a marker to a new location
     */
    function transition(marker, markerId, latitude, longitude, callbackFn){
        if (typeof deviceTransitions != "undefined") {
            if (typeof Worker != "undefined" && deviceTransitions instanceof Worker) {
                deviceTransitions.postMessage({
                    cmd: 'transition',
                    marker: {latitude: marker.getPosition().lat(),
                             longitude: marker.getPosition().lng()},
                    markerId: markerId,
                    latitude: latitude,
                    longitude: longitude});
                transitionCallbacks[markerId] = callbackFn;
            } else {
                deviceTransitions.transition(marker, markerId, latitude, longitude, callbackFn);
            }
        } else {
            var latlng = new google.maps.LatLng(latitude, longitude);
            marker.setPosition(latlng);
            if (typeof callbackFn == "function") {
                callbackFn();
            }
        }
    }

    /*
     * calculate the distance in km between two locations (straight line)
     */
    function getDistanceBetweenLatLngInKm(lat1,lon1,lat2,lon2) {
        var dLat = deg2rad(lat2-lat1);
        var dLon = deg2rad(lon2-lon1); 
        var a    = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
                   Math.sin(dLon/2) * Math.sin(dLon/2);
        var c    = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d    = earthRadiusKM * c;              // Distance in km
        return d;
    }

    /*
     * convert degrees to radians
     */
    function deg2rad(deg) {
        return deg * (Math.PI/180);
    }


    /*
     * set marker based on speed and heading
     */
    function setMarkerSpeedAndHeading(marker, speed, heading) {
        var icon = marker.getIcon();
        if (speed > 0) {
            icon.fillColor = "green";
        } else {
            setMarkerStopped(marker);
        }
        
        icon.rotation = parseInt(heading);
        marker.setIcon(icon);
    }

    /*
     * set marker as stopped
     */
    function setMarkerStopped(marker) {
        marker.getIcon().fillColor = "red";
    }

    
    return {
        
        /*
         * add or move a marker for a device on the map
         * device = {id        : n, 
         *           latitude  : n,
         *           longitude : n,
         *           speed     : n,
         *           heading   : n }
         */
        markDevice : function(device) {
            var marker = markers[device.id];
            if (marker) {
                if (marker.getVisible() &&
                    maxDistanceToTrans > getDistanceBetweenLatLngInKm(marker.getPosition().lat(),
                                                                      marker.getPosition().lng(),
                                                                      device.latitude,
                                                                      device.longitude)) {
                    if (device.speed > 0) { setMarkerSpeedAndHeading(marker, device.speed, device.heading); }
                    transition(marker, device.id, device.latitude, device.longitude,
                               function(){ if (device.speed === 0) { setMarkerStopped(marker); } });
                } else {
                    marker.setPosition( new google.maps.LatLng(device.latitude, device.longitude) );
                    setMarkerSpeedAndHeading(marker, device.speed, device.heading);
                }
            } else {
                var location = new google.maps.LatLng(device.latitude, device.longitude);
                marker = new google.maps.Marker({
                    position: location,
                    icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 4,
                        fillOpacity: 0.8,
                        strokeWeight: 1,
                    },
                    map: map,
                    title: device.id.toString()
                });
                
                setMarkerSpeedAndHeading(marker, device.speed, device.heading);
                
                markers[device.id] = marker;
                marker.addListener("mouseover", function(event) {
                    document.getElementById("data-" + device.id).classList.add("selected");
                });
                marker.addListener("mouseout", function(event) {
                    document.getElementById("data-" + device.id).classList.remove("selected");
                });
                
                marker.addListener("click", function(event) {
                    document.getElementById("data-" + device.id).scrollIntoView(true);
                    deviceMap.centerOnDevice(device.id);
                });

            }
            

            return marker;
        },

        removeDevice : function(id) {
            var marker = markers[id];
            marker.setMap(null);
            delete markers[id];
        },

        showDevice : function(id, visible) {
            var marker = markers[id];
            marker.setVisible(visible); 
        },

        centerOnDevice : function(id) {
            var marker = markers[id];
            
            if (map && marker) {
                if (map.getZoom() < 8) {
                    map.setZoom(8);
                }
                map.setCenter(marker.getPosition());
            }
        },

        zoomToPolygon : function(polygon) {
            map.fitBounds(polygon.getBounds());
        },

        resetZoom : function() {
            map.setZoom(mapOptions.zoom);
            map.setCenter(mapOptions.center);
        }
        
    };

}();
