var config = {};

config.ws = { port: 3700,
              greeting: "Welcome to the reading monitor" };

config.mq = { wsServerURL : "http://localhost:3700/",
              mqHost      : "localhost",
              mqPort      : 61613,
              mqLogin     : "admin",
              mqPasscode  : "admin",
              mqName      : "/queue/readings" };

module.exports = config;
