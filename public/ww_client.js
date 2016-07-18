/* jshint shadow:true */
/* jshint sub:true */

importScripts("socket.io.js");
importScripts("ws_client.js");


self.addEventListener('message', function(e) {
    var data = e.data;
    console.log("WORKER:" + JSON.stringify(data));
    switch (data.cmd) {
    case 'start':
        //websocketClient = websocketClient(data.url);
        websocketClient.start(function(title) {self.postMessage({cmd: 'title', title: title});});
        break;
    case 'changeTitle':
        websocketClient.changeTitle(data.title);
        self.postMessage({cmd: 'title', title: data.title});
        break;
    case 'connectToAccount':
        websocketClient.connectToAccount(data.accountId, {
            connect    : function(accountId) {
                self.postMessage({
                    cmd: 'connected',
                    accountId: accountId
                });},
            deviceList : function(deviceList, subscribedDevices) {
                self.postMessage({
                    cmd: 'deviceList',
                    deviceList: deviceList,
                    subscribedDevices : subscribedDevices
                });},
            reading    : function(device, counter) {
                self.postMessage({
                    cmd: 'updateDevice',
                    device: device,
                    counter : counter
                });}
        });
        break;
    case 'subscribeToDevices':
        var subscribedCount = websocketClient.subscribeToDevices(data.devices).length;
        self.postMessage({
            cmd: 'subscribedCount',
            subscribedCount: subscribedCount
        });

        break;
    }
}, false);
