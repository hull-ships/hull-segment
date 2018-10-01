// @flow

const webpackMiddleware = require("webpack-dev-middleware");
const webpack = require("webpack");
const webpackConfig = require("../webpack.config");

module.exports = function devMode(): string {
  const compiler = webpack(webpackConfig);
  return webpackMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    contentBase: "src",
    stats: {
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false
    }
  });
}
