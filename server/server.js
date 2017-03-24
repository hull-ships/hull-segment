import jwt from "jwt-simple";
import Promise from "bluebird";
import { notifHandler } from "hull/lib/utils";

import devMode from "./dev-mode";
import SegmentHandler from "./handler";
import handlers from "./events";

import analyticsClientFactory from "./analytics-client";
import updateUser from "./update-user";


module.exports = function server(app, options = {}) {
  const { Hull, hostSecret, port, onMetric, clientConfig = {} } = options;

  const connector = new Hull.Connector({ hostSecret, port, clientConfig });

  connector.setupApp(app);

  if (options.devMode) {
    app.use(devMode());
  }

  app.get("/admin.html", connector.clientMiddleware(), (req, res) => {
    const { config } = req.hull;
    const apiKey = jwt.encode(config, hostSecret);
    res.render("admin.html", { apiKey });
  });

  const analyticsClient = analyticsClientFactory();

  // redirect internally /batch  to /notify
  app.use("/", (req, res, next) => {
    req.url = req.url.replace("/batch", "/notify");
    next();
  });

  app.use("/notify", notifHandler({
    userHandlerOptions: {
      groupTraits: false,
      maxSize: 1,
      maxTime: 1
    },
    handlers: {
      "user:update": (ctx, messages = []) => {
        return Promise.all(messages.map(message => updateUser(analyticsClient)({ message }, {
          ship: ctx.ship,
          hull: ctx.client
        })));
      }
    }
  }));

  const segment = SegmentHandler({
    onError(err) {
      console.warn("Error handling segment event", err, err && err.stack);
    },
    onMetric,
    connector,
    Hull,
    handlers,
  });

  app.post("/segment", segment);

  // Error Handler
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err) {
      const data = {
        status: err.status,
        segmentBody: req.segment,
        method: req.method,
        headers: req.headers,
        url: req.url,
        params: req.params
      };
      console.log("Error ----------------", err.message, err.status, data);
      console.log(err.stack);
    }

    return res.status(err.status || 500).send({ message: err.message });
  });

  app.exit = () => segment.exit();

  connector.startApp(app);

  return app;
};
