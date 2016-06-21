window.onload = function() {

    var message                 = document.getElementById("message");

    var titleEl                 = document.getElementById("title");
    var titleButton             = document.getElementById("title-button");

    var accountEl               = document.getElementById("account");
    var accountButton           = document.getElementById("account-button");

    var deviceListEl            = document.getElementById("deviceList");
    var deviceButton            = document.getElementById("device-button");
    var deviceAllButton         = document.getElementById("deviceAll-button");

    var id                      = document.getElementById("id");
    var longitude               = document.getElementById("longitude");
    var latitude                = document.getElementById("latitude");
    var readingButton           = document.getElementById("reading-button");

    var readingTblEl            = document.getElementById("data-table-body");
    var subscribedDeviceCountEl = document.getElementById("subdevice-value");
    var deviceCountEl           = document.getElementById("device-value");
    var readingCountEl          = document.getElementById("counter-value");

    var mapOptions = {
        zoom: 4,
        center: new google.maps.LatLng(40.8191, -96.710716),  //approx center of US
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById("map"), mapOptions);

    if (websocketClient) {

        websocketClient.start(message, map);
        
        titleButton.onclick = function() {
            websocketClient.changeTitle(titleEl.value, message);
        };
        
        accountButton.onclick = function() {
            websocketClient.connectToAccount(accountEl.value, deviceListEl, deviceCountEl, readingTblEl, readingCountEl);
            subscribedDeviceCountEl.innerHTML = deviceListEl.selectedOptions.length;
            deviceButton.disabled    = false;
            deviceAllButton.disabled = false;
            readingButton.disabled   = false;
        };
        
        deviceButton.onclick = function() {
            var selectedOptionEls = deviceListEl.selectedOptions;
            var devices = [];
            for (var i = 0; i < selectedOptionEls.length; i++) {
                devices.push(selectedOptionEls[i].value || selectedOptionEls[i].text);
            }
            websocketClient.subscribeToDevices(devices);

            subscribedDeviceCountEl.innerHTML = deviceListEl.selectedOptions.length;
        };
        
        deviceAllButton.onclick = function() {
            var selectedOptionEls = deviceListEl.options;
            var devices = [];
            for (var i = 0; i < selectedOptionEls.length; i++) {
                devices.push(selectedOptionEls[i].value || selectedOptionEls[i].text);
                selectedOptionEls[i].setAttribute("selected", "selected");
            }
            websocketClient.subscribeToDevices(devices);

            subscribedDeviceCountEl.innerHTML = deviceListEl.options.length;
        };
        
        readingButton.onclick = function() {
            websocketClient.submitManualReading(accountEl.value,
                                                id.value,
                                                latitude.value,
                                                longitude.value,
                                                speed.value,
                                                heading.value
                                               );
        };
        
    } else {
        console.error("WebSocketClient is not initialized");
    }

};
