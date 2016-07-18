/* jshint shadow:true */
/* jshint sub:true */


window.onload = function() {

    var accountEl               = document.getElementById("account");
    var id                      = document.getElementById("id");
    var longitude               = document.getElementById("longitude");
    var latitude                = document.getElementById("latitude");
    var readingButton           = document.getElementById("reading-button");

    if (readingButton) {
        readingButton.onclick = function() {
            websocketClient.submitManualReading(accountEl.value,
                                                id.value,
                                                latitude.value,
                                                longitude.value,
                                                speed.value,
                                                heading.value
                                               );
        };
    }

};

