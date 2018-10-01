// // @flow
//
// const Promise = require("bluebird");
// const _ = require("lodash");
// const express = require("express");
// const segmentAuthMiddleware = require("./lib/segment-auth-middleware");
// const {
//   scheduleHandler,
//   notificationHandler,
//   batchHandler
// } = require("hull/lib/handlers");
//
// const devmode = require("./dev-mode");
// const SegmentHandler = require("./segment-handler");
// const segmentEvents = require("./events");
// const HullHandlersFactory = require("./handlers");
// const errorHandler = require("./handlers/error");
// const statusHandler = require("./handlers/status");
// const debug = require("debug")("hull-segment:server");
//
// import type { $Application, $Request, $Response } from "express";
// import type { HullServerConfig } from "hull";
// import type { HullRequest } from "./types";
//
// module.exports = function server({
//   Hull,
//   devMode,
//   connectorConfig
// }: HullServerConfig) {
//
//   if (devMode) {
//     app.use(devmode());
//   }
//
//   const hullHandlers = HullHandlersFactory();
//   app.post("/notifier", notificationHandler(hullHandlers));
//   app.post("/batch", batchHandler(hullHandlers));
//   app.post("/batch-accounts", batchHandler(hullHandlers));
//
//   app.use(
//     "/segment",
//     SegmentHandler({
//       Hull,
//       handlers: segmentEvents
//     })
//   );
//   app.all("/status", scheduleHandler(statusHandler));
//
//   // Error Handler
//   app.use(errorHandler);
//
//   // Can't find any documentation about this anywhere. Care to explain ?
//   // app.exit = () => segment.exit();
//
//   connector.startApp(app);
//   return app;
// };
