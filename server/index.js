// @flow

const Hull = require("hull");
const { Cache } = require("hull/lib/infra");
const redisStore = require("cache-manager-redis");

const status = require("./handlers/status");
const userUpdate = require("./handlers/user");
const accountUpdate = require("./handlers/account");
const segment = require("./handlers/segment");
const manifest = require("../manifest.json");
const authMiddleware = require("./lib/segment-auth-middleware");
const analyticsClientFactory = require("./analytics-client");

const {
  LOG_LEVEL,
  PORT,
  SECRET,
  NODE_ENV,
  OVERRIDE_FIREHOSE_URL,
  REDIS_URL,
  SHIP_CACHE_TTL
} = process.env;

const analyticsClient = analyticsClientFactory();
const user = userUpdate(analyticsClient);
const account = accountUpdate(analyticsClient);

Hull.start({
  devMode: NODE_ENV === "development",
  manifest,
  middlewares: [authMiddleware],
  handlers: {
    segment,
    status,
    userUpdate: user,
    accountUpdate: account,
    userBatch: user,
    accountBatch: account
  },
  connectorConfig: {
    logLevel: LOG_LEVEL,
    hostSecret: SECRET || "1234",
    port: PORT || 8082,
    clientConfig: {
      firehoseUrl: OVERRIDE_FIREHOSE_URL
    },
    cache:
      REDIS_URL &&
      new Cache({
        store: redisStore,
        url: REDIS_URL,
        ttl: SHIP_CACHE_TTL || 60
      })
  }
});
