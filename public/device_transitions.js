/* jshint shadow:true */
/* jshint sub:true */

var deviceTransitions = function() {
    /* use strict */

    var snapToRoads = false;

    /* variables to animate marker movements */
    var markerTransitions  = {};
    var transitionDelay    = 500;     // in milliseconds
    var newReadingInterval = 60;      // in seconds
    // 1 delta transition every transitionDelay/1000 second for newReadingInterval - 1
    // or, one transition ever 1/4 second for 59 seconds
    var numDeltas          = (newReadingInterval - 1) * (1000 / transitionDelay); 
    var earthRadiusKM      = 6371.008; // Radius of the earth in km (http://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html)

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
     * move the marker the next step of the transition
     */
    function moveMarker(marker, markerId){
        if (typeof markerTransitions[markerId] != "undefined") {
            var latitude  = marker.getPosition().lat();
            var longitude = marker.getPosition().lng();

            if (markerTransitions[markerId].snapped) {

                // if we've come to a new snapped position
                if ( markerTransitions[markerId].deltasPerSnap.length >= 1 &&
                     markerTransitions[markerId].deltaNum >= markerTransitions[markerId].deltasPerSnap[0] ) {
                    markerTransition[markerId].deltaNum = 0;
                    markerTransition[markerId].deltasPerSnap.shift();
                    markerTransition[markerId].deltaLat = markerTransition[markerId].snapDeltaLat.shift();
                    markerTransition[markerId].deltaLng = markerTransition[markerId].snapDeltaLng.shift();
                    
                    // ensure we're at the snapped location
                    var location = markerTransition[markerId].snapLocations.shift();
                    latlng = new LatLng(location.latitude, location.longitude);
                    marker.setPosition(latlng);
                    
                    // if this was the last location, then stop the transition
                    if (markerTransitions[markerId].snapLocation.length === 0) {
                        if (typeof markerTransitions[markerId].callbackFn == "function") {
                            markerTransitions[markerId].callbackFn();
                        }
                        delete markerTransitions[markerId];
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

    /*
     * when a new reading has come in before the last set of transitions is done, this will finish up the
     * pending transition instantly
     */
    function finishTransition(marker, markerId) {
        if (markerTransitions[markerId].snapped &&
            typeof markerTransitions[markerId].snapLocations != "undefined" &&
            markerTransitions[markerId].snapLocations.length > 0) {
            
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
                
                // immediately complete last transition
                finishTransition(marker, markerId);
            }
            
            // setup new transition
            var markerTransition = { snapped  : snapToRoads,
                                     deltaNum : 0,
                                     deltaLat : (latitude - marker.getPosition().lat())/numDeltas,
                                     deltaLng : (longitude - marker.getPosition().lng())/numDeltas,
                                     callbackFn : callbackFn };
            markerTransitions[markerId] = markerTransition;
            
            if (! snapToRoads) {
                // if we're not getting any intermediary points from
                // Google, then start moving the marker over the
                // straight line between old and new locations
                moveMarker(marker, markerId);
                
            } else {
                // use Google's snap to roads API to get intermediary
                // points on the road as it curves
                var xmlhttp = new XMLHttpRequest();
                var url = 'https://roads.googleapis.com/v1/snapToRoads' +
                    '?path=' + marker.getPosition().lat() + "," + marker.getPosition().lng() + "|" +
                    latitude + "," + longitude +
                    '&interpolate=true' +
                    '&key=[googleKey]';
                
                xmlhttp.onreadystatechange = function() {
                    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                        var data = JSON.parse(xmlhttp.responseText);

                        // if we got something back and it has more
                        // points that the original 2, then determine
                        // intermediary points
                        if (typeof data.snappedPoints != "undefined" && data.snappedPoints.length > 2) {
                            var totalDistance = getDistanceBetweenLatLngInKm(data.snappedPoints[0].latitude,
                                                                             data.snappedPoints[0].longitude,
                                                                             data.snappedPoints[data.snappedPoints.length - 1].latitude,
                                                                             data.snappedPoints[data.snappedPoints.length - 1].longitude);
                           
                            markerTransition.snapLocations = [];
                            markerTransition.deltasPerSnap = [];
                            markerTransition.snapDeltaLat  = [];
                            markerTransition.snapDeltaLng  = [];

                            for (var i = 1; i < data.snappedPoints.length; i++) {
                                markerTransition.snapLocations.push(data.snappedPoints[i].location);

                                var snapDistance = getDistanceBetweenLatLngInKm(data.snappedPoints[i - 1].latitude,
                                                                                data.snappedPoints[i - 1].longitude,
                                                                                data.snappedPoints[i].latitude,
                                                                                data.snappedPoints[i].longitude);

                                var numDeltasPerSnap = Math.round(numDeltas * (snapDistance / totalDistance));
                                
                                // based on distance between snap locations, subdevice deltas proportionally
                                markerTransition.deltasPerSnap.push(numDeltasPerSnap);
                                markerTransition.snapDeltaLat.push( (data.snappedPoints[i - 1].latitude - data.snappedPoints[i].latitude) /
                                                                numDeltasPerSnap);
                                markerTransition.snapDeltaLng.push( (data.snappedPoints[i - 1].longitude - data.snappedPoints[i].latitude) /
                                                                numDeltasPerSnap);

                            }
                            

                            
                        } else {
                            // do normal transitions
                            markerTransition.snapped = false;
                        }
                        
                        moveMarker(marker, markerId);
                    } else if (xmlhttp.status == 429) {
                        // Google returned an error, so do normal transitions
                        // {
                        //   "error": {
                        //     "code": 429,
                        //     "message": "Request throttled due to project QPS limit being reached.",
                        //     "status": "RESOURCE_EXHAUSTED",
                        //     "details": [
                        //       {
                        //         "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                        //         "violations": [
                        //           {
                        //             "subject": "project:279764407745",
                        //             "description": "Request throttled due to project QPS limit being reached."
                        //           }
                        //         ]
                        //       }
                        //     ]
                        //   }
                        // }
                        console.error("Google error, using default");
                        markerTransition.snapped = false;
                        moveMarker(marker, markerId);
                    }
                };
                xmlhttp.open("GET", url, true);
                xmlhttp.send();
            }
        }
        
    };
    
}();
