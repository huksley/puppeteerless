const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const slsw = require("serverless-webpack");
const nodeExternals = require("webpack-node-externals");

const logger = console;
/* eslint-disable @typescript-eslint/no-empty-function */
logger.verbose = process.env.LOG_VERBOSE === "1" ? logger.info : () => {};

/** Create fonts layer */
const downloadFonts = async () => {
  const dir = path.resolve(__dirname, "layers/fonts");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const font = path.resolve(__dirname, "layers", "fonts", "NotoColorEmoji.ttf");
  if (!fs.existsSync(font)) {
    logger.info("Downloading", font);
    const response = await fetch(
      "https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf"
    );
    const buffer = await response.buffer();
    const s = fs.createWriteStream(font);
    s.write(buffer, () => s.close());
  }
};

/**
 * Copy folder recursively.
 *
 * @param {string} source - Source path-like
 * @param {string} target - Target path-like
 * @param {Function} reader - Optional file reader, for transformation
 * @param {number} level - How dee in the folder
 */
const copyFolderRecursiveSync = (source, target, reader) => {
  if (!fs.existsSync(source)) {
    throw new Error("Not found: " + source);
  }

  const stat = fs.lstatSync(source);
  if (stat.isDirectory()) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);
    files.forEach(file => {
      const currentSource = path.join(source, file);
      const currentTarget = path.join(target, file);
      if (fs.lstatSync(currentSource).isDirectory()) {
        logger.verbose("Copy", currentSource);
        copyFolderRecursiveSync(currentSource, currentTarget, reader);
      } else {
        logger.verbose("Write", currentSource);
        fs.writeFileSync(
          currentTarget,
          reader ? reader(currentSource, currentTarget) : fs.readFileSync(currentSource)
        );
      }
    });
  }
};

/** Create layer with Chrome and dependencies */
const createChromeAwsLambdaLayer = async () => {
  const dir = path.resolve(__dirname, "layers/chrome-aws-lambda/nodejs/node_modules");
  deleteFolderSync(dir);
  fs.mkdirSync(dir, { recursive: true });

  copyModule(
    path.resolve(__dirname, "node_modules", "chrome-aws-lambda"),
    path.resolve(dir, "chrome-aws-lambda")
  );

  copyModule(
    path.resolve(__dirname, "node_modules", "puppeteer-core"),
    path.resolve(dir, "puppeteer-core")
  );
};

const findParentModule = modulePath => {
  if (fs.existsSync(modulePath)) {
    return modulePath;
  }

  let parent = path.resolve(modulePath, "../..");
  const moduleName = path.basename(modulePath);
  while (!fs.existsSync(path.resolve(parent, "node_modules", moduleName))) {
    parent = path.resolve(parent, "..");
    if (parent === "/") {
      throw new Error("Not found: " + moduleName);
    }
  }

  return path.resolve(parent, "node_modules", moduleName);
};

// Copy module with dependencies
const copyModule = (src, dst) => {
  copyFolderRecursiveSync(src, dst);

  if (fs.existsSync(src + "/package.json")) {
    const package = JSON.parse(fs.readFileSync(src + "/package.json", { encoding: "utf-8" }));
    const deps = Object.keys(package.dependencies || {});
    deps.forEach(name => {
      const modulePath = findParentModule(path.resolve(src, "..", name));
      copyModule(modulePath, path.resolve(dst, "..", name));
    });

    // Copy dependencies of internal dependencies
    const internal = path.resolve(src, "node_modules");
    if (fs.existsSync(internal)) {
      const modules = fs.readdirSync(internal);
      modules.forEach(key =>
        copyModule(path.resolve(internal, key), path.resolve(dst, "node_modules", key))
      );
    }
  }
};

const deleteFolderSync = removePath => {
  if (fs.existsSync(removePath)) {
    fs.readdirSync(removePath).forEach(file => {
      var curPath = path.join(removePath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderSync(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(removePath);
  }
};

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
        loader: "babel-loader"
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
              await downloadFonts();
              createChromeAwsLambdaLayer();
              return callback();
            }
          );

          compiler.hooks.beforeCompile.tapAsync(
            "ChromeLambdaLayer",
            async (_params, callback) => {
              createChromeAwsLambdaLayer();
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
