/* jshint shadow:true */
/* jshint sub:true */

var deviceMap = function() {
    /* use strict */

    var snapToRoads = false;
    
    var mapOptions = {
        zoom: 4,
        center: new google.maps.LatLng(40.8191, -96.710716),  //approx center of US
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    
    var map                = new google.maps.Map(document.getElementById("map"), mapOptions);
    var markers            = {};
    var earthRadiusKM      = 6371.008; // Radius of the earth in km (http://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html)

    /* variables to animate marker movements */
    var markerTransitions  = {};
    var transitionDelay    = 250;     // in milliseconds
    var newReadingInterval = 60;      // in seconds
    // 1 delta transition every transitionDelay/1000 second for newReadingInterval - 1
    // or, one transition ever 1/4 second for 59 seconds
    var numDeltas          = (newReadingInterval - 1) * (1000 / transitionDelay); 

    // this is the maximum distance in KM that will be allowed to render in a transition.
    // anything beyond this will simply my moved.
    var maxDistanceToTrans = 5;

    /*
     * setup a transition (animation) of a marker to a new location
     */
    function transition(marker, markerId, latitude, longitude, callbackFn){
        // if a new transition is set before the last one is complete, cancel the last one
        if (typeof markerTransitions[markerId] != "undefined") {
            // stop further transitions for the old movement
            clearTimeout(markerTransitions[markerId].timeout);
            
            // complete last transition
            
            if (markerTransitions[markerId].snapped && markerTransitions[markerId].snapLocations.length > 0) {

                var location = markerTransitions[markerId].snapLocations.pop();
                var latlng = new google.maps.LatLng(location.latitude, location.longitude);
                marker.setPosition(latlng);
                
            } else {
                
                var lat = marker.getPosition().lat();
                var lng = marker.getPosition().lng();
                
                lat += markerTransitions[markerId].deltaLat * (numDeltas - markerTransitions[markerId].deltaNum);
                lng += markerTransitions[markerId].deltaLng * (numDeltas - markerTransitions[markerId].deltaNum);
                
                var latlng = new google.maps.LatLng(lat, lng);
                marker.setPosition(latlng);
                
                /*
                  console.log("Rapidly completed existing transition with " +
                  (numDeltas - markerTransitions[markerId].deltaNum) + " deltas remaining (" +
                  (((numDeltas - markerTransitions[markerId].deltaNum) * transitionDelay) / 1000) +
                  " seconds)");
                */
            }
        }
        
        // setup new transition
        var markerTransition = { snapped  : snapToRoads,
                                 deltaNum : 0,
                                 deltaLat : (latitude - marker.getPosition().lat())/numDeltas,
                                 deltaLng : (longitude - marker.getPosition().lng())/numDeltas,
                                 callbackFn : callbackFn };
        markerTransitions[markerId] = markerTransition;

        if (! snapToRoads) {

            moveMarker(marker, markerId);

        } else {
            // snap to roads
            var xmlhttp = new XMLHttpRequest();
            var url = 'https://roads.googleapis.com/v1/snapToRoads' +
                '?path=' + marker.getPosition().lat() + "," + marker.getPosition().lng() + "|" +
                latitude + "," + longitude +
                '&interpolate=true' +
                '&key=[googleKey]';
            
            xmlhttp.onreadystatechange = function() {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    var data = JSON.parse(xmlhttp.responseText);

                    if (data.snappedPoints.length > 0) {
                        var locations = [];
                        for (var i = 1; i < data.snappedPoints.length; i++) {
                            locations.push(data.snappedPoints[i].location);
                        }
                        
                        // figure out number of locations
                        // add in delta transitions to fill in gaps between snapped locations

                        markerTransition.snapLocations = locations;
                        markerTransition.deltasPerSnap = Math.round(numDeltas / data.snappedPoints.length);
                        markerTransition.deltaLat      = (locations[0].latitude - marker.getPosition().lat()) /
                            markerTransition.deltasPerSnap;
                        markerTransition.deltaLng      = (locations[0].longitude - marker.getPosition().lng()) /
                            markerTransition.deltasPerSnap;
                        
                    }

                    moveMarker(marker, markerId);
                }
            };
            xmlhttp.open("GET", url, true);
            xmlhttp.send();
        }
    }

    /* 
     * move the marker the next step of the transition
     */
    function moveMarker(marker, markerId){
        if (typeof markerTransitions[markerId] != "undefined") {
            var latitude  = marker.getPosition().lat();
            var longitude = marker.getPosition().lng();

            if (markerTransitions[markerId].snapped) {

                // if we've come to a new snapped position
                if ( markerTransitions[markerId].deltaNum >= markerTransitions[markerId].deltasPerSnap ) {
                    
                    var location = markerTransitions[markerId].snapLocations.shift();
                    var latlng   = new google.maps.LatLng(location.latitude, location.longitude);
                    marker.setPosition(latlng);

                    if (markerTransitions[markerId].snapLocations.length === 0) {
                        // if this was the last location, then stop the transition
                        if (typeof markerTransitions[markerId].callbackFn == "function") {
                            markerTransitions[markerId].callbackFn();
                        }
                        delete markerTransitions[markerId];
                    } else {
                        // otherwise set up the next step
                        markerTransitions[markerId].deltaNum = 0;
                        markerTransitions[markerId].deltaLat =
                            (markerTransitions[markerId].snapLocations[0].latitude - marker.getPosition().lat()) /
                            markerTransitions[markerId].deltasPerSnap;
                        markerTransitions[markerId].deltaLng =
                            (markerTransitions[markerId].snapLocations[0].longitude - marker.getPosition().lng()) /
                            markerTransitions[markerId].deltasPerSnap;
                        markerTransitions[markerId].timeout = setTimeout(function() {
                            moveMarker(marker, markerId); }, transitionDelay);
                    }

                    return;
                }
            }
            
            latitude  += markerTransitions[markerId].deltaLat;
            longitude += markerTransitions[markerId].deltaLng;
            
            var latlng = new google.maps.LatLng(latitude, longitude);
            marker.setPosition(latlng);
            
            if ( markerTransitions[markerId].deltaNum != numDeltas ){
                markerTransitions[markerId].deltaNum++;
                markerTransitions[markerId].timeout = setTimeout(function() {
                    moveMarker(marker, markerId); }, transitionDelay);
            } else {
                if (typeof markerTransitions[markerId].callbackFn == "function") {
                    markerTransitions[markerId].callbackFn();
                }
                delete markerTransitions[markerId];
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
