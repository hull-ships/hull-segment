//@flow

const jwt = require("jwt-simple");

import type { $Response } from "express";
import type { HullRequest } from "../types";

module.exports = function(req: HullRequest, res: $Response) {
  const { hostname, hull } = req;
  const { clientCredentials, clientCredentialsToken, connectorConfig } = hull;
  const { hostSecret } = connectorConfig;
  const apiKey = jwt.encode(clientCredentials, hostSecret);
  const encoded = new Buffer(apiKey).toString("base64");
  res.render("admin.html", {
    apiKey,
    clientCredentialsToken,
    encoded,
    hostname
  });
}
