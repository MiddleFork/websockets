/* jshint shadow:true */
/* jshint sub:true */

var deviceMap = function() {
    /* use strict */
    
    var mapOptions = {
        zoom: 4,
        center: new google.maps.LatLng(40.8191, -96.710716),  //approx center of US
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map               = new google.maps.Map(document.getElementById("map"), mapOptions);
    var markers           = {};
    var stoppedIcon       = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
    var movingIcon        = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';

    /* animate marker movements */
    var markerTransitions = {};
    var numDeltas         = 100;
    var delay             = 10; //milliseconds
    
    function transition(marker, markerId, latitude, longitude){
        var markerTransation = { deltaNum : 0,
                                 deltaLat : (latitude - marker.getPosition().lat())/numDeltas,
                                 deltaLng : (longitude - marker.getPosition().lng())/numDeltas };
        markerTransitions[markerId] = markerTransation;
        moveMarker(marker, markerId);
    }
    
    function moveMarker(marker, markerId){
        if (typeof markerTransitions[markerId] != "undefined") {
            var latitude  = marker.getPosition().lat();
            var longitude = marker.getPosition().lng();
            
            latitude  += markerTransitions[markerId].deltaLat;
            longitude += markerTransitions[markerId].deltaLng;
            
            var latlng = new google.maps.LatLng(latitude, longitude);
            marker.setPosition(latlng);
            
            if( markerTransitions[markerId].deltaNum != numDeltas ){
                markerTransitions[markerId].deltaNum++;
                setTimeout(function() {moveMarker(marker, markerId);}, delay);
            } else {
                delete markerTransitions[markerId];
            }
        }
    }

    
    return {
        
        markDevice : function(id, latitude, longitude, speed) {
            var marker = markers[id];
            if (marker) {
                // marker.setPosition( new google.maps.LatLng(latitude, longitude) );
                transition(marker, id, latitude, longitude);
            } else {
                var location = new google.maps.LatLng(latitude, longitude);
                marker = new google.maps.Marker({
                    position: location,
                    map: map,
                    title: id.toString()
                });
                markers[id] = marker;
                marker.addListener("mouseover", function(event) {
                    document.getElementById("data-" + id).classList.add("selected");
                });
                marker.addListener("mouseout", function(event) {
                    document.getElementById("data-" + id).classList.remove("selected");
                });
                
                marker.addListener("click", function(event) {
                    document.getElementById("data-" + id).scrollIntoView(true);
                    deviceMap.centerOnDevice(id);
                });
                
            }
            
            if (speed > 0) {
                marker.setIcon(movingIcon);
            } else {
                marker.setIcon(stoppedIcon);
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
                map.setZoom(8);
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
