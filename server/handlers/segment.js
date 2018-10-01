// @flow

import _ from "lodash";
import type { HullContext, SegmentIncomingPayload } from "../types";
import type { HullExternalResponse, HullExternalHandlerMessage } from "hull";
// const debug = require("debug")("hull-segment:segment-handler");
import events from "../events";
import { ValidationError } from "hull/lib/errors";

const camelize = message => _.mapKeys(message, (v, k) => _.camelCase(k));

module.exports = (
  ctx: HullContext,
  messages: Array<HullExternalHandlerMessage>
): HullExternalResponse => {
  const { client, connector, clientCredentialsToken, metric } = ctx;
  // $FlowFixMe
  if (!client | !connector) {
    throw new ValidationError(
      "missing or invalid credentials",
      "SEGMENT_INVALID_CREDENTIALS",
      400
    );
  }
  return Promise.all(
    messages.map(({ body }) => {
      if (!body) {
        throw new ValidationError(`Empty Payload`, "SEGMENT_EMPTY_CONTENT", 501);
      }
      const message: SegmentIncomingPayload = body;
      const { type } = message;
      const handler = events[type];
      client.logger.debug(`incoming.${type}.start`, {
        message,
        clientCredentialsToken
      });
      metric.increment(`request.${type}`);
      if (!handler) {
        throw new ValidationError(`Not Supported`, "SEGMENT_NO_HANDLER", 501);
      }
      const { integrations = {} } = message;
      if (integrations.Hull === false) {
        return;
      }
      return handler(ctx, camelize(message));
    })
  ).then(
    () => ({ message: "thanks" }),
    err => {
      if (err) {
        // const data: any = {
        //   status: err.status,
        //   segmentBody: req.segment,
        //   method: req.method,
        //   headers: req.headers,
        //   url: req.url,
        //   params: req.params,
        //   data: null
        // };
        // if (err.status === 500) {
        //   data.stack = err.stack;
        // }
        // hull.client.logger.debug(err.message, data);
        throw err;
      }
    }
  );
};
