//@flow

import _ from "lodash";
import type { HullHandlersConfiguration } from "hull/lib/types";
import type { Transaction } from "../types";

import analyticsClientFactory from "../analytics-client";
import updateUser from "./user";
import updateAccount from "./account";

module.exports = function(): HullHandlersConfiguration {
  const analyticsClient = analyticsClientFactory();
  return {
    "user:update": updateAccount(analyticsClient),
    "account:update": updateUser(analyticsClient)
  };
};
