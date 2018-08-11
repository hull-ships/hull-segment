// @flow
import type { $NextFunction, $Request, $Response } from "express";
import type { StatusError } from "./types";

module.exports = (
  err: StatusError,
  req: $Request,
  res: $Response,
  next: $NextFunction
) => {
  // eslint-disable-line no-unused-vars
  if (err) {
    const data = {
      status: err.status,
      segmentBody: req.segment,
      method: req.method,
      headers: req.headers,
      url: req.url,
      params: req.params
    };
    console.log("Error ----------------", {
      message: err.message,
      status: err.status,
      data
    });
    // console.log(err.stack);
  }

  return res.status(err.status || 500).send({
    message: err.message
  });
};
