/* jshint shadow:true */
/* jshint sub:true */

var deviceTransitions = function() {
    /* use strict */

    var snapToRoads = false;

    /* variables to animate marker movements */
    var markerTransitions  = {};
    var transitionDelay    = 250;     // in milliseconds
    var newReadingInterval = 60;      // in seconds
    // 1 delta transition every transitionDelay/1000 second for newReadingInterval - 1
    // or, one transition ever 1/4 second for 59 seconds
    var numDeltas          = (newReadingInterval - 1) * (1000 / transitionDelay); 

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
                    var latlng;
                    if (typeof google != "undefined" && typeof google.maps != "undefined") {
                        latlng = new google.maps.LatLng(location.latitude, location.longitude);
                    } else if (typeof LatLng != "undefined") {
                        latlng = new LatLng(location.latitude, location.longitude);
                    }
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

            var latlng;
            if (typeof google != "undefined" && typeof google.maps != "undefined") {
                latlng = new google.maps.LatLng(latitude, longitude);
            } else if (typeof LatLng != "undefined") {
                latlng = new LatLng(latitude, longitude);
            }
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

    return {
        /*
         * setup a transition (animation) of a marker to a new location
         */
        transition : function(marker, markerId, latitude, longitude, callbackFn){
            // if a new transition is set before the last one is complete, cancel the last one
            if (typeof markerTransitions[markerId] != "undefined") {
                // stop further transitions for the old movement
                clearTimeout(markerTransitions[markerId].timeout);
                
                // complete last transition
                
                if (markerTransitions[markerId].snapped && markerTransitions[markerId].snapLocations.length > 0) {
                    
                    var location = markerTransitions[markerId].snapLocations.pop();
                    var latlng;
                    if (typeof google != "undefined" && typeof google.maps != "undefined") {
                        latlng = new google.maps.LatLng(location.latitude, location.longitude);
                    } else if (typeof LatLng != "undefined") {
                        latlng = new LatLng(location.latitude, location.longitude);
                    }
                    marker.setPosition(latlng);
                    
                } else {
                    
                    var lat = marker.getPosition().lat();
                    var lng = marker.getPosition().lng();
                    
                    lat += markerTransitions[markerId].deltaLat * (numDeltas - markerTransitions[markerId].deltaNum);
                    lng += markerTransitions[markerId].deltaLng * (numDeltas - markerTransitions[markerId].deltaNum);
                    
                    var latlng;
                    if (typeof google != "undefined" && typeof google.maps != "undefined") {
                        latlng = new google.maps.LatLng(lat, lng);
                    } else if (typeof LatLng != "undefined") {
                        latlng = new LatLng(lat, lng);
                    }
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
        
    };
    
}();
