window.onload = function() {
	
	var socket        = new io.connect('http://localhost:3700');
    var message       = document.getElementById("message");

    var title         = document.getElementById("title");
    var titleButton   = document.getElementById("title-button");

    var account       = document.getElementById("account");
    var accountButton = document.getElementById("account-button");

    var id            = document.getElementById("id");
    var longitude     = document.getElementById("longitude");
    var latitude      = document.getElementById("latitude");
    var readingButton = document.getElementById("reading-button");

    var tableBody     = document.getElementById("data-table-body");
    var deviceValue   = document.getElementById("device-value");
    var counterValue  = document.getElementById("counter-value");
    var counter       = 0;
    var currentAccount;
    
    socket.on('message', function(data){
        if (data.title) {
            message.innerHTML = data.title;
        }
    });

    socket.on('reading', function(data) {
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
                for (var i = 0; i < tableBody.childElementCount; i++) {
                    oldTR = tableBody.children[i];
                    if (oldTR.id > newTR.id) {
                        tableBody.insertBefore(newTR, oldTR);
                        added = true;
                        break;
                    }
                }
                if (!added) {
                    tableBody.appendChild(newTR);
                }
                deviceValue.innerHTML = tableBody.childElementCount;
            }
            counter++;
            counterValue.innerHTML = counter;
        }
    });

    titleButton.onclick = function() {
        if (title.value.length > 0) {
            var newTitle = { title : title.value };
            console.log("sending: ", newTitle );
            socket.emit('send', newTitle );
        }
    };

    accountButton.onclick = function() {
        if (account.value.length > 0) {
            var message = {};
            if (currentAccount) {
                message.unsubscribe = currentAccount;
                tableBody.innerHTML = "";
            }
            currentAccount = account.value;
            message.subscribe = currentAccount;
            console.log("sending: ", message );
            socket.emit('send', message );
            readingButton.disabled = false;
        }
    };

    readingButton.onclick = function() {
        if (currentAccount && id.value.length > 0) {
            var newReading = {account: currentAccount, id : id.value, latitude : latitude.value, longitude : longitude.value };
            console.log("sending: ", newReading );
            socket.emit('send', { reading : newReading});
        }
    };
};
