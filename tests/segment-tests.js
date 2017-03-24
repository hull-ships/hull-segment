/* global describe, it */
const request = require("supertest");
const sinon = require("sinon");
const assert = require("assert");
const jwt = require("jwt-simple");
import _ from "lodash";
import express from "express";
import bodyParser from "body-parser";
import Hull from "hull"

import server from "../server/server";
const { track, identify, page, screen } = require("./fixtures");

const API_RESPONSES = {
  default: {
    settings: {
      handle_pages: false,
      handle_screens: false
    }
  },
  page: {
    settings: {
      handle_pages: true,
      handle_screens: false
    }
  },
  screen: {
    settings: {
      handle_pages: false,
      handle_screens: true
    }
  }
};

const hostSecret = "shuut";
const hullSecret = "hullSecret";

const config = {
  secret: hullSecret,
  organization: "localhost:8080",
  ship: "56f3d53ef89a8791cb000004"
};

function sendRequest({ query, body, headers, metric, logger }) {
  const app = express();
  const client = request(server(app, { hostSecret, onMetric: metric, Hull, clientConfig: { protocol: "http", flushAt: 1, flushAfter: 1 } }));
  return client.post("/segment")
    .query(query || config)
    .set(headers || {})
    .type("json")
    .send(body || track);
}

describe("Segment Ship", () => {
  let requests = [];
  let testApp;
  let testServer;
  let shipData = {
    settings: { handle_pages: true }
  };

  afterEach(function(done) {
    requests = [];
    testServer.close(done);
  });
  beforeEach(function(done) {
    testApp = express();
    testApp.use(bodyParser.json());
    testApp.use(bodyParser.text());
    testApp.use((req, res, next) => {
      requests.push(_.pick(req, ["method", "url", "body", "query", "params"]));
      next();
    });
    testApp.all("/*", (req, res) => {
      res.json(shipData);
    });

    testServer = testApp.listen(8080, done);
  });

  describe("Error payloads", () => {
    it("Invalid body", (done) => {
      sendRequest({ body: "{boom" })
          .expect({ message: "Not Supported" })
          .expect(501, done);
    });

    it("Missing credentials", (done) => {
      sendRequest({ body: track, query: {} })
          .expect({ message: "Missing Credentials" })
          .expect(400, done);
    });
  });

  describe("With credentials - webhook style", () => {
    it("should return 200 with valid claims", (done) => {
      sendRequest({ body: track, query: config })
          .expect({ message: "thanks" })
          .expect(200, done);
    });
  });

  describe("With credentials - direct style", () => {
    it("should return 200 with a valid token", (done) => {
      const token = jwt.encode(config, hostSecret);
      sendRequest({ body: track, headers: { authorization: `Basic ${new Buffer(token).toString("base64")}` } })
          .expect({ message: "thanks" })
          .expect(200, done);
    });

    it("should trim the token when passed with extra spaces", (done) => {
      const token = jwt.encode(config, hostSecret);
      sendRequest({ body: track, headers: { authorization: `Basic ${new Buffer(` ${token} `).toString("base64")}` } })
          .expect({ message: "thanks" })
          .expect(200, done);
    });

    it("should return Invalid token with a token signed with an invalid signature", (done) => {
      const token = jwt.encode(config, `${hostSecret}invalid`);
      sendRequest({ body: track, headers: { authorization: `Basic ${new Buffer(token).toString("base64")}` } })
          .expect({ message: "Invalid Token" })
          .expect(401, done);
    });

    it("should return Missing credentials with a token with missing claims", (done) => {
      const token = jwt.encode({ organization: "abc.boom", secret: hullSecret }, hostSecret);
      sendRequest({
        query: { foo: "bar" },
        body: track,
        headers: {
          authorization: `Basic ${new Buffer(token).toString("base64")}`
        }
      })
      .expect({ message: "Missing Credentials" })
      .expect(400, done);
    });
  });


  describe("Ship not found", () => {
    it("should return 401 if ship is not found", (done) => {
      sendRequest({ body: track, query: { ...config, ship: "not_found" } })
          .expect({ message: "id property in Configuration is invalid: not_found" })
          .expect(401, done);
    });
  });

  describe("Call type not supported", () => {
    it("should return 401 if ship is not found", (done) => {
      sendRequest({ body: { type: "bogus" }, query: config })
          .expect({ message: "Not Supported" })
          .expect(501, done);
    });
  });


  describe("Handling events", () => {
    it("call Hull.track on track event", (done) => {
      sendRequest({ body: track, query: config })
        .expect({ message: "thanks" })
        .expect(200)
        .end(() => {
          setTimeout(() => {
            const tReq = _.find(requests, { url: "/api/v1/firehose" });
            assert(tReq.body.batch[0].type === "track");
            assert(tReq.body.batch[0].body.event === "Viewed Checkout Step");
            done();
          }, 10);
        });
    });

    it("call Hull.track on page event", (done) => {
      sendRequest({ body: page, query: config })
        .expect({ message: "thanks" })
        .expect(200)
        .end(() => {
          setTimeout(() => {
            const tReq = _.find(requests, { url: "/api/v1/firehose" });
            assert(tReq.body.batch[0].type === "track");
            assert(tReq.body.batch[0].body.event === "page");
            done();
          }, 10);
        });
    });

    it("should not Hull.track on page event by default", (done) => {
      shipData = {
        settings: {}
      };
      sendRequest({ body: page, query: config })
        .expect({ message: "thanks" })
        .expect(200)
        .end(() => {
          setTimeout(() => {
            const tReq = _.find(requests, { url: "/api/v1/firehose" });
            assert(!tReq);
            done();
          }, 10);
        });
    });


    it("call Hull.track on screen event", (done) => {
      shipData = {
        settings: {
          handle_screens: true
        }
      };
      sendRequest({ body: screen, query: config })
        .expect({ message: "thanks" })
        .expect(200)
        .end(() => {
          setTimeout(() => {
            const tReq = _.find(requests, { url: "/api/v1/firehose" });
            assert(tReq.body.batch[0].type === "track");
            assert(tReq.body.batch[0].body.event === "screen");
            done();
          }, 10);
        });
    });

    it("should not Hull.track on screen event by default", (done) => {
      shipData = {
        settings: {}
      };
      sendRequest({ body: screen, query: config })
        .expect({ message: "thanks" })
        .expect(200)
        .end(() => {
          setTimeout(() => {
            const tReq = _.find(requests, { url: "/api/v1/firehose" });
            assert(!tReq);
            done();
          }, 10);
        });
    });

    it("call Hull.traits on identify event", (done) => {
      const traits = {
        id: "12",
        visitToken: "boom",
        firstname: "James",
        lastname: "Brown",
        createdat: "2016-05-02T10:39:17.812Z",
        email: "james@brown.com",
        coconuts: 32
      };

      // const traitsSpy = sinon.spy();
      // const MockHull = mockHullFactory(traitsSpy, API_RESPONSES.default);
      sendRequest({ body: { ...identify, traits }, query: config })
          .expect(200)
          .expect({ message: "thanks" })
          .end(() => {
            const payload = {
              first_name: "James",
              last_name: "Brown",
              created_at: "2016-05-02T10:39:17.812Z",
              email: "james@brown.com",
              coconuts: 32
            };
            setTimeout(() => {
              const tReq = _.find(requests, { url: "/api/v1/firehose" });
              assert(tReq.body.batch[0].type === "traits");
              assert(_.isEqual(tReq.body.batch[0].body, payload));
              done();
            }, 10);
          });
    });
  });

  // describe("Collecting metric", () => {
  //   it("call metric collector", (done) => {
  //     const metricHandler = sinon.spy();
  //     sendRequest({ metric: metricHandler })
  //         .expect({ message: "thanks" })
  //         .expect(200)
  //         .end(() => {
  //           assert(metricHandler.withArgs("request.track").calledOnce);
  //           done();
  //         });
  //   });
  // });

  // describe("Collecting logs", () => {
  //   it("call logs collector", (done) => {
  //     const log = sinon.spy();

  //     sendRequest({ logger: { debug: log, info: log } })
  //         .expect({ message: "thanks" })
  //         .expect(200)
  //         .end(() => {
  //           assert(log.withArgs("track.success").calledOnce);
  //           assert(log.withArgs("message").calledOnce);
  //           done();
  //         });
  //   });
  // });
});
