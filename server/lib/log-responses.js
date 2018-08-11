//@flow

import _ from "lodash";

import type {
  HullContext,
  HullUserUpdateMessage,
  HullAccountUpdateMessage
} from "hull";
import type { Transaction } from "../types";

module.exports = (ctx: HullContext, actions: Array<Transaction>) => {
  _.map(_.groupBy(_.compact(actions), "action"), (responses, action) => {
    ctx.client.logger.info(`outgoing.account.${action}`, {
      messages: _.pick(responses, "id", "message")
    });
  });
};
