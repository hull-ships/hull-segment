//@flow

import type { HullContext } from "hull/lib/types";

module.exports = (ctx: HullContext): void => {
  if (
    ctx &&
    ctx.smartNotifierResponse &&
    ctx.smartNotifierResponse.setFlowControl
  ) {
    ctx.smartNotifierResponse.setFlowControl({
      type: "next",
      size: parseInt(process.env.FLOW_CONTROL_SIZE, 10) || 100,
      in: parseInt(process.env.FLOW_CONTROL_IN, 10) || 1
    });
  }
};
