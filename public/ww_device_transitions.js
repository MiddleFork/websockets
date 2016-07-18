/* jshint shadow:true */
/* jshint sub:true */

importScripts("device_transitions.js");

// simulate Google API objects
var LatLng = function(latitude, longitude) {
    return {
        lat : function() {
            return latitude;
        },
        lng : function() {
            return longitude;
        },
        toJSON: function() {
            return {latitude: latitude, longitude: longitude};
        }
    };
};

var Marker = function(id, latitude, longitude) {
    var position = new LatLng(latitude, longitude);
    
    return {
        getPosition : function() {
            return position;
        },

        setPosition : function(latLng) {
            position = new LatLng(latLng.lat(), latLng.lng());
            self.postMessage({ cmd: 'moveMarker', markerId: id, latLng: position.toJSON()});  
        }
    };
};


self.addEventListener('message', function(e) {
    var data = e.data;
    switch (data.cmd) {
    case 'transition':
        // accept {cmd: 'transition', marker: {latitude: n1, longitude: m1}, markerId: i, latitude: n2, longitude: m2}
        var marker = new Marker(data.markerId, data.marker.latitude, data.marker.longitude);
        deviceTransitions.transition(marker, data.markerId, data.latitude, data.longitude, function() {
            self.postMessage({
                cmd: 'transitioned',
                markerId: data.markerId}); } );
        break;
    }
});
