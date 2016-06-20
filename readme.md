# WebSocket Readings Client

This project contains a simple WebSocket client, server, and reading
simulator.  The client will subscribe to a specific rooms based on an
account id.  As new readings for that account are received it will
update them in a table.  Manual readings can also be submitted by the
client.  The server will collect readings and publish them to the
account specific rooms.  The simulator will generate randmon GPS
coordinates for different accounts and device ids and send them to the
server for distribution to the clients.

## Installation

1. Clone the git repository

2. Install the node dependencies via `npm install`

## Usage

1. Start up the server `node server.js`

2. Start up some clients by opening browser tabs to
`http://localhost:3700/`

3. Subscribe each client to an account.  Currently the simulator uses
account ids 1-5, so enter a value of 1-5 in the account field and
press 'Start'.  

4. Start the simulator by either starting it up as a node process
`node simulator.js` or by opening a browser to
`http://localhost:3700/simulator.html`.  Then press the "Start"
button.




