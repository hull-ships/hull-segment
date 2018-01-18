const _ = require("lodash");
const Hull = require("hull");
const handlers = require("./events").default;
const Promise = require("bluebird");

Hull.logger.transports.console.level = "debug";

Hull.logger.transports.console.json = true;

function camelize(str) {
  const ret = str.replace(/[-_\s]+(.)?/g, (match, c) => (c ? c.toUpperCase() : ""));
  return ret.charAt(0).toLowerCase() + ret.slice(1);
}

const _handlers = {};
const _flushers = [];
_.map(handlers, (fn, event) => {
  _handlers[event] = _handlers[event] || [];
  _handlers[event].push(fn);
  if (typeof fn.flush === "function") {
    _flushers.push(fn.flush);
  }
  return this;
});

function processMiddleware(req, res, next) {
  if (!req.hull || !req.hull.client || !req.hull.ship) {
    const e = new Error("Missing Credentials");
    e.status = 400;
    return next(e);
  }

  const { client: hull, ship, token } = req.hull;
  const metric = (name) => {
    console.log("METRIC", name);
  };

  const { message } = req.segment;

  const eventName = message.type;
  const eventHandlers = _handlers[eventName];
  if (hull) {
    hull.logger.debug(`incoming.${eventName}.start`, { message, token });
  } else {
    Hull.logger.debug(`incoming.${eventName}.start`, { message, token });
  }

  metric(`request.${eventName}`, 1);
  console.log({ eventHandlers, message });
  if (eventHandlers && eventHandlers.length > 0) {
    if (message && message.integrations && message.integrations.Hull === false) {
      return next();
    }

    Object.keys(message).map((k) => {
      const camelK = camelize(k);
      message[camelK] = message[camelK] || message[k];
      return k;
    });


    const processors = eventHandlers.map(fn => fn(message, { ship, hull, metric }));

    return Promise.all(processors).then(() => {
      next();
    });
  }
  next();
}

exports.handler = (event, context, callback) => {
  console.log("SECRET", process.env.SECRET);
  // console.log('Received event:', JSON.stringify(event, null, 2));
  Promise.map(event.Records, (record) => {
    // Kinesis data is base64 encoded so decode here
    const payload = new Buffer(record.kinesis.data, "base64").toString("utf8");
    try {
      const parsed = JSON.parse(payload);
      const ctx = {};

      const authorization = _.get(parsed, "params.header.Authorization", []);
      const [authType, token64] = authorization.split(" ");

      if (authType === "Basic" && token64) {
        ctx.token = new Buffer(token64, "base64").toString().split(":")[0].trim();

        return new Promise((resolve, reject) => {
          Hull.Middleware({ hostSecret: process.env.SECRET })({
            hull: ctx
          }, {}, () => {
            processMiddleware({
              hull: ctx,
              segment: {
                body: parsed.body,
                message: parsed.body,
              }
            }, {}, () => {
              resolve();
              console.log("result", ctx);
            });
          });
        });
      }
    } catch (e) {
      console.error(e);
    }
  }).then(() => {
    callback(null, `Successfully processed ${event.Records.length} records.`);
  });
};

