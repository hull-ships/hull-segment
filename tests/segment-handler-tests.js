/* global describe, it */
import sinon from "sinon";
import assert from "assert";
import _ from "lodash";

import segmentHandler from "../server/handler";

const defaultHandlerConfig = {
  onError: () => {},
  connector: {
    clientMiddleware: () => {
      return (req, res, next) => {
        next();
      };
    }
  },
  Hull: {
    logger: {
      info: () => {}
    }
  },
  handlers: {},
};

const defaultReqStub = {
  url: "http://localhost/",
  headers: {}
};

const defaultResStub = {
  status: () => {
    return defaultResStub;
  },
  send: () => {}
};

describe("Segment Handler", () => {
  it("should handle missing credentials with error response", done => {
    const segment = segmentHandler(defaultHandlerConfig);
    sinon.spy(defaultResStub, "status");
    sinon.spy(defaultResStub, "send");
    segment(defaultReqStub, defaultResStub);

    assert(defaultResStub.status.firstCall.args[0] === 400);
    assert(defaultResStub.send.firstCall.args[0].message === "Missing Credentials");

    done();
  });

  it("should trim the token when passed with extra spaces", (done) => {
    const middlewareSpy = sinon.spy((req, res, next) => {
      next();
    });

    const handlerConfig = _.defaults({
      connector: {
        clientMiddleware: () => {
          return middlewareSpy;
        }
      }
    }, defaultHandlerConfig);
    const reqStub = _.defaults({
      headers: {
        authorization: `Basic ${new Buffer(" example.   ").toString("base64")}`
      }
    }, defaultReqStub);
    const segment = segmentHandler(handlerConfig);

    segment(reqStub, defaultResStub);
    assert(middlewareSpy.firstCall.args[0].hull.token === "example.");
    done();
  });
});
