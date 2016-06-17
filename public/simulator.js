window.onload = function() {
	
	var socket               = new io.connect('http://localhost:3700');
    var log                  = document.getElementById("log");
    var numAccounts          = 5;
    var numDevicesPerAccount = 30;
    var status               = document.getElementById("status");
    var stopButton           = document.getElementById("stop");
    var intervalId;


    function sendBatchOf(size) {
        for (var i = 0; i < size; i++) {
            var randomAccount = Math.round(Math.random() * numAccounts);
            var newReading    = {account : randomAccount,
                                 id : randomAccount + ("0000000000" + Math.round(Math.random() * numDevicesPerAccount)).slice(-10),
                                 latitude : (Math.random() * 360) - 180,
                                 longitude : (Math.random() * 180) - 90 };
            socket.emit('send', { reading : newReading});

            /*
            console.log("sending: ", newReading );
            var p = document.createElement('p');
            p.innerHTML = JSON.stringify(newReading);
            log.appendChild(p);
            */
        }
    }

    function start() {
        intervalId = setInterval(function() { sendBatchOf(50); }, 10);
        status.innerHTML = "Sending...";
        stopButton.value = "Stop";
        stopButton.setAttribute("class", "stop");
        stopButton.onclick = stop;
    }

    function stop() {
        clearInterval(intervalId);
        status.innerHTML = "Stopped.";
        stopButton.value = "Start";
        stopButton.setAttribute("class", "start");
        stopButton.onclick = start;
    }
    
    stopButton.onclick = start;
};
