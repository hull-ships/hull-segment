// @flow

import jwt from "jwt-simple";
import Promise from "bluebird";
import _ from "lodash";

import { notificationHandler, batchHandler } from "hull/lib/handlers";

import type {
  HullContext,
  HullUserUpdateMessage,
  HullAccountUpdateMessage
} from "hull";

import devMode from "./dev-mode";
import SegmentHandler from "./handler";
import handlers from "./events";
import errorHandler from "./handlers/error";
import hullHandlers from "./handlers";

import statusHandler from "./status";

module.exports = function server(app: *, options: * = {}) {
  const { Hull, hostSecret, onMetric, clientMiddleware } = options;

  if (options.devMode) {
    app.use(devMode());
  }

  app.get("/admin.html", clientMiddleware, (req, res) => {
    const { config } = req.hull;
    const apiKey = jwt.encode(config, hostSecret);
    const encoded = new Buffer(apiKey).toString("base64");
    const hostname = req.hostname;
    res.render("admin.html", {
      apiKey,
      encoded,

      hostname
    });
  });

  app.post("/notifier", notificationHandler(hullHandlers));
  app.post("/batch", batchHandler(hullHandlers));
  app.post("/batch-accounts", batchHandler(hullHandlers));

  const segment = SegmentHandler({
    onError(err) {
      console.warn("Error handling segment event", err, err && err.stack);
    },
    onMetric,
    clientMiddleware,
    Hull,
    handlers
  });

  app.post("/segment", segment);
  app.all("/status", statusHandler);

  // Error Handler
  app.use(errorHandler);

  app.exit = () => segment.exit();

  return app;
};
