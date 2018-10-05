// @flow

const { Cache } = require("hull/lib/infra");
const redisStore = require("cache-manager-redis");
const status = require("./handlers/status");
const userUpdateFactory = require("./handlers/user");
const accountUpdateFactory = require("./handlers/account");
const segment = require("./handlers/segment");
const manifest = require("../manifest.json");
const authMiddleware = require("./lib/segment-auth-middleware");
const analyticsClientFactory = require("./analytics-client");
import type { HullConnectorConfig } from "hull";

/*
export type HullConnectorConfig = {
  hostSecret: ?string,
  port: number | string,
  json?: JsonConfig,
  clientConfig: HullClientConfiguration,
  instrumentation?: InstrumentationAgent,
  cache?: Cache,
  queue?: Queue,
  connectorName?: string,
  segmentFilterSetting?: any,
  skipSignatureValidation?: boolean,
  notificationValidatorHttpClient?: Object,
  devMode: boolean,
  middlewares: Array<Middleware>,
  manifest: HullManifest,
  handlers: HullHandlers,
  timeout?: number | string
};
*/

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
const userUpdate = userUpdateFactory(analyticsClient);
const accountUpdate = accountUpdateFactory(analyticsClient);

const connectorConfig: HullConnectorConfig = {
  manifest,
  devMode: NODE_ENV === "development",
  logLevel: LOG_LEVEL,
  hostSecret: SECRET || "1234",
  port: PORT || 8082,
  clientConfig: {
    firehoseUrl: OVERRIDE_FIREHOSE_URL
  },
  middlewares: [authMiddleware],
  handlers: {
    segment,
    status,
    userUpdate,
    accountUpdate
  },
  cache:
    REDIS_URL &&
    new Cache({
      store: redisStore,
      url: REDIS_URL,
      ttl: SHIP_CACHE_TTL || 60
    })
};

module.exports = connectorConfig;
