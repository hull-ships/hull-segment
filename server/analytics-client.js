// @flow

import Analytics from "analytics-node";
import type { SegmentClient, SegmentClientFactory } from "./types";

module.exports = function analyticsClientFactory(): SegmentClientFactory {
  const analytics = {};
  return function analyticsClient(write_key: string): SegmentClient {
    const a = analytics[write_key];
    if (!a) analytics[write_key] = new Analytics(write_key);
    return analytics[write_key];
  };
};
