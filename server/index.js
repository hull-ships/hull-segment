/* eslint global-require: 0 */
import Hull from "hull";
import express from "express";

import server from "./server";

if (process.env.NEW_RELIC_LICENSE_KEY) {
  console.warn("Starting newrelic agent with key: ", process.env.NEW_RELIC_LICENSE_KEY);
  require("newrelic");
}

if (process.env.LOG_LEVEL) {
  Hull.logger.transports.console.level = process.env.LOG_LEVEL;
}

Hull.logger.transports.console.json = true;

const options = {
  Hull,
  hostSecret: process.env.SECRET || "1234",
  port: process.env.PORT || 8082,
  devMode: process.env.NODE_ENV === "development",
  onMetric: function onMetric(metric, value, ctx) {
    console.log(`[${ctx.id}] segment.${metric}`, value);
  }
};


if (process.env.LIBRATO_TOKEN && process.env.LIBRATO_USER) {
  const librato = require("librato-node");
  librato.configure({
    email: process.env.LIBRATO_USER,
    token: process.env.LIBRATO_TOKEN
  });
  librato.on("error", function onError(err) {
    console.error(err);
  });

  process.once("SIGINT", function onSigint() {
    librato.stop(); // stop optionally takes a callback
  });
  librato.start();

  options.onMetric = function onMetricProduction(metric = "", value = 1, ctx = {}) {
    try {
      if (librato) {
        librato.measure(`segment.${metric}`, value, Object.assign({}, { source: ctx.id }));
      }
    } catch (err) {
      console.warn("error in librato.measure", err);
    }
  };
}

const app = express();
const connector = new Hull.Connector({
  hostSecret: options.hostSecret,
  port: options.port
});
options.clientMiddleware = connector.clientMiddleware();

connector.setupApp(app);

server(app, options);

connector.startApp(app);
