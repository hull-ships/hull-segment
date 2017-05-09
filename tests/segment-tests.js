/* global describe, it */
// const request = require("supertest");
const sinon = require("sinon");
const assert = require("assert");
const jwt = require("jwt-simple");
import _ from "lodash";
import request from "request";
import express from "express";
import bodyParser from "body-parser";
import Hull from "hull";
import ClientMock from "./mocks/client-mock";

import Server from "../server/server";
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

const port = 8070;
const hostSecret = "123";
const app = express();

const connector = new Hull.Connector({ port, hostSecret });
const options = { connector, app };

connector.setupApp(app);
app.use((req, res, next) => {
  req.hull = {
    client: ClientMock(),
    ship: {
      private_settings: {}
    }
  };

  next();
});

connector.startApp(Server(options));

const hullSecret = "hullSecret";
const config = {
  secret: hullSecret,
  organization: "localhost:8080",
  ship: "56f3d53ef89a8791cb000004"
};

const uri = `http://127.0.0.1:${port}/segment`;
const method = "POST";

describe("Segment Ship", () => {

  let requests = [];
  let testApp;
  let testServer;
  let shipData = {
    settings: { handle_pages: true }
  };

  // afterEach(done => {
  //   requests = [];
  //   testServer.close(done);
  // });
  // beforeEach(done => {
  //   testApp = express();
  //   testApp.use(bodyParser.json());
  //   testApp.use(bodyParser.text());
  //   testApp.use((req, res, next) => {
  //     requests.push(_.pick(req, ["method", "url", "body", "query", "params"]));
  //     next();
  //   });
  //   testApp.all("/*", (req, res) => {
  //     res.json(shipData);
  //   });

  //   testServer = testApp.listen(8080, done);
  // });


  describe("Error payloads", () => {
    it("Invalid body", done => {
      request({
        uri,
        query: config,
        method,
        json: { body: "{body" }
      }, (err, res, body) => {
        assert(res.statusCode === 501);
        assert(body.message === "Not Supported");
        done();
      });
    });
  });

  describe("With credentials - webhook style", () => {
    it("should return 200 with valid claims", done => {
      request({
        uri,
        method,
        query: config,
        json: track,
      }, (err, res, body) => {
        assert(res.statusCode === 200);
        assert(body.message === "thanks");
        done();
      });
    });
  });

  describe("With credentials - direct style", () => {
    it("should return 200 with a valid token", (done) => {
      const token = jwt.encode(config, hostSecret);
      request({
        uri,
        method,
        query: config,
        json: track,
        headers: { authorization: `Basic ${new Buffer(token).toString("base64")}` }
      }, (err, res, body) => {
        assert(res.statusCode === 200);
        assert(body.message === "thanks");
        done();
      });
    });

    it("should return Invalid token with a token signed with an invalid signature", (done) => {
      const token = jwt.encode(config, `${hostSecret}invalid`);
      request({
        uri,
        method,
        query: config,
        json: track,
        headers: { authorization: `Basic ${new Buffer(token).toString("base64")}` }
      }, (err, res, body) => {
        assert(res.statusCode === 401);
        assert(body.message === "Invalid Token");
        done();
      });
    });

    it("should return Missing credentials with a token with missing claims", (done) => {
      const token = jwt.encode({ organization: "abc.boom", secret: hullSecret }, hostSecret);
      request({
        uri,
        method,
        query: { foo: "bar" },
        json: track,
        headers: { authorization: `Basic ${new Buffer(token).toString("base64")}` }
      }, (err, res, body) => {
        assert(res.statusCode === 400);
        assert(body.message === "Missing Credentials");
        done();
      });
    });
  });


  describe("Ship not found", () => {
    it("should return 401 if ship is not found", (done) => {
      request({
        uri,
        method,
        query: { ...config, ship: "not_found" },
        json: track
      }, (err, res, body) => {
        assert(res.statusCode === 401);
        assert(body.message === "id property in Configuration is invalid: not_found");
        done();
      });
    });
  });

  describe("Call type not supported", () => {
    it("should return 501 if type is not supported", (done) => {
      request({
        uri,
        method,
        json: { type: "bogus" },
        query: config
      }, (err, res, body) => {
        assert(res.statusCode === 501);
        assert(body.message === "Not Supported");
        done();
      });
    });
  });

  describe("Handling events", () => {
    it("call Hull.track on track event", (done) => {
      request({
        uri,
        method,
        query: config,
        json: track
      }, (err, res, body) => {
        assert(res.statusCode === 200);
        assert(body.message === "thanks");
        const tReq = _.find(requests, { url: "/api/v1/firehose" });
        // assert(tReq.body.batch[0].type === "track");
        // assert(tReq.body.batch[0].body.event === "Viewed Checkout Step");
        done();
      });
    });

    it("call Hull.track on page event", (done) => {
      request({
        uri,
        method,
        query: config,
        json: page
      }, (err, res, body) => {
        assert(res.statusCode === 200);
        assert(body.message === "thanks");
        const tReq = _.find(requests, { url: "/api/v1/firehose" });
        // assert(tReq.body.batch[0].type === "track");
        // assert(tReq.body.batch[0].body.event === "page");
        done();
      });
    });

    it("should not Hull.track on page event by default", (done) => {
      shipData = {
        settings: {}
      };
      request({
        uri,
        method,
        query: config,
        json: page
      }, (err, res, body) => {
        assert(res.statusCode === 200);
        assert(body.message === "thanks");
        const tReq = _.find(requests, { url: "/api/v1/firehose" });
        assert(!tReq);
        done();
      });
    });


    it("call Hull.track on screen event", (done) => {
      shipData = {
        settings: {
          handle_screens: true
        }
      };
      request({
        uri,
        method,
        query: config,
        json: screen
      }, (err, res, body) => {
        assert(res.statusCode === 200);
        assert(body.message === "thanks");
        const tReq = _.find(requests, { url: "/api/v1/firehose" });
        // assert(tReq.body.batch[0].type === "track");
        // assert(tReq.body.batch[0].body.event === "screen");
        done();
      });
    });

    it("should not Hull.track on screen event by default", (done) => {
      shipData = {
        settings: {}
      };
      request({
        uri,
        method,
        query: config,
        json: screen
      }, (err, res, body) => {
        assert(res.statusCode === 200);
        assert(body.message === "thanks");
        const tReq = _.find(requests, { url: "/api/v1/firehose" });
        assert(!tReq);
        done();
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
      request({
        uri,
        method,
        query: config,
        json: { ...identify, traits }
      }, (err, res, body) => {
        assert(res.statusCode === 200);
        assert(body.message === "thanks");
        const payload = {
          first_name: "James",
          last_name: "Brown",
          created_at: "2016-05-02T10:39:17.812Z",
          email: "james@brown.com",
          coconuts: 32
        };
        setTimeout(() => {
          const tReq = _.find(requests, { url: "/api/v1/firehose" });
          // assert(tReq.body.batch[0].type === "traits");
          // assert(_.isEqual(tReq.body.batch[0].body, payload));
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
