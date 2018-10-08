import simpleMock from "simple-mock";

const { ClientMock } = require("./client-mock");

class ConnectorMock {
  constructor(id = "1234", settings = {}, private_settings = {}) {
    this.id = id;
    this.settings = settings;
    this.private_settings = private_settings;
  }
}

class ContextMock {
  constructor(id = "1234", settings = {}, private_settings = {}) {
    this.ship = new ConnectorMock(id, settings, private_settings);
    this.connector = new ConnectorMock(id, settings, private_settings);
    this.client = new ClientMock();

    this.metric = {};
    simpleMock.mock(this.metric, "increment").callFn((name, value) => console.log(name, value));
    simpleMock.mock(this.metric, "value").callFn((name, value) => console.log(name, value));

    this.cache = {};
    simpleMock.mock(this.cache, "wrap").callFn((key, cb) => Promise.resolve(cb));
    simpleMock.mock(this.cache, "get").callFn(() => Promise.resolve());
    simpleMock.mock(this.cache, "set").callFn(() => Promise.resolve());

    this.helpers = {};
    simpleMock.mock(this.helpers, "updateSettings").callFn(() => Promise.resolve(this.connector));
  }
}

module.exports = { ConnectorMock, ContextMock };
