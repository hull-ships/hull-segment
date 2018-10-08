import simpleMock from "simple-mock";

const Promise = require("bluebird");

class ClientMock {
  constructor() {
    this.configuration = { secret: "topsecret123" };
    this.logger = {};
    simpleMock.mock(this.logger, "info").callFn((msg, data) => console.log(msg, data));
    simpleMock.mock(this.logger, "debug").callFn((msg, data) => console.log(msg, data));
    simpleMock.mock(this.logger, "error").callFn((msg, data) => console.log(msg, data));
    simpleMock.mock(this.logger, "warn").callFn((msg, data) => console.log(msg, data));
    simpleMock.mock(this.logger, "log").callFn((msg, data) => console.log(msg, data));

    simpleMock.mock(this, "get").callFn(() => Promise.resolve());
    simpleMock.mock(this, "post").callFn(() => Promise.resolve());
    simpleMock.mock(this, "put").callFn(() => Promise.resolve());
    simpleMock.mock(this, "traits").callFn(() => Promise.resolve());
    simpleMock.mock(this, "asUser").callFn(() => this);
    simpleMock.mock(this, "asAccount").callFn(() => this);
    simpleMock.mock(this, "account").callFn(() => this);
  }
}

module.exports = { ClientMock };
