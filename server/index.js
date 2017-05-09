/* eslint global-require: 0 */
import Hull from "hull";
import express from "express";

const { PORT = 8082, SECRET = "123", LOG_LEVEL, NODE_ENV = "development" } = process.env;

if (LOG_LEVEL) {
  Hull.logger.transports.console.level = process.env.LOG_LEVEL;
}

const app = express();
const connector = new Hull.Connector({ port: PORT, hostSecret: SECRET });

export default {
  connector,
  app,
  devMode: NODE_ENV
};
