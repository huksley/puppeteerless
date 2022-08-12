const path = require("path");
const slsw = require("serverless-webpack");
const nodeExternals = require("webpack-node-externals");
const { copyChromeLayer } = require("./tools/copyChromeLayer");
const { downloadFonts } = require("./tools/downloadFonts");
const { logger } = require("./tools/logger");

/**
 * @type {import('webpack').Configuration}
 **/
module.exports = {
  stats: "minimal",
  mode: slsw.lib.webpack.isLocal ? "development" : "production",
  entry: slsw.lib.entries,
  devtool: slsw.lib.webpack.isLocal ? "source-map" : "source-map",
  resolve: {
    extensions: [".js", ".ts", ".tsx"],
    symlinks: false,
    cacheWithContext: false
  },
  output: {
    libraryTarget: "commonjs",
    path: path.resolve(__dirname, ".webpack"),
    filename: "[name].js"
  },
  optimization: {
    emitOnErrors: true,
    minimize: false,
    concatenateModules: false
  },
  target: "node",
  externalsPresets: { node: true },
  externals: [nodeExternals({})],
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        loader: "babel-loader",
        options: {
          configFile: path.resolve(__dirname, ".babelrc-serverless")
        }
      }
    ]
  },
  plugins: [
    {
      apply: compiler => {
        if (compiler.hooks && compiler.hooks.beforeCompile) {
          compiler.hooks.beforeCompile.tapAsync(
            "FontsLambdaLayer",
            async (_params, callback) => {
              await downloadFonts(__dirname);
              return callback();
            }
          );

          compiler.hooks.beforeCompile.tapAsync(
            "ChromeLambdaLayer",
            async (_params, callback) => {
              copyChromeLayer(__dirname);
              return callback();
            }
          );
        } else {
          logger.warn("Cannot find compiler.hooks.beforeCompile hook");
        }
      }
    }
  ]
};
