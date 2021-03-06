var config     = {};

config.ws      = { port        : 3700,
                   attachQueue : false,
                   useRedis    : false,
                   greeting    : "Welcome to the reading monitor" };

config.redis   = { host: "localhost",
                   port: 6379 };

config.mq      = { wsServerURL : "ws://localhost:3700/",
                   mqHost      : "localhost",
                   mqPort      : 61613,
                   mqLogin     : "admin",
                   mqPasscode  : "admin",
                   mqName      : "/queue/readings" };

module.exports = config;
