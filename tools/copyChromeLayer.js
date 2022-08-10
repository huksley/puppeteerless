const fs = require("fs");
const path = require("path");

const logger = console;
exports.logger = logger;
/* eslint-disable @typescript-eslint/no-empty-function */
logger.verbose = process.env.LOG_VERBOSE === "1" ? logger.info : () => {};

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
const createChromeLayer = rootDir => {
  const dir = path.resolve(rootDir, "layers/chrome-aws-lambda/nodejs/node_modules");
  deleteFolderSync(dir);
  fs.mkdirSync(dir, { recursive: true });

  const module = Object.keys(
    JSON.parse(fs.readFileSync(path.resolve(rootDir, "package.json"))).dependencies
  ).find(key => key.endsWith("chrome-aws-lambda"));

  logger.info("Packing as layer", module);
  copyModule(path.resolve(rootDir, "node_modules", module), path.resolve(dir, module));

  copyModule(
    path.resolve(rootDir, "node_modules", "puppeteer-core"),
    path.resolve(dir, "puppeteer-core")
  );
};

const findModulePath = modulePath => {
  let parent = path.resolve(modulePath, "..");
  let dirName = path.basename(parent);
  while (dirName != "node_modules") {
    parent = path.resolve(parent, "..");
    dirName = path.basename(parent);
    if (parent === "/") {
      throw new Error("Parent node_modules not found: " + modulePath);
    }
  }

  return path.resolve(parent);
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
  fs.mkdirSync(dst, { recursive: true });
  logger.verbose("Copy module", src, dst);
  copyFolderRecursiveSync(src, dst);

  if (fs.existsSync(src + "/package.json")) {
    const package = JSON.parse(fs.readFileSync(src + "/package.json", { encoding: "utf-8" }));
    const deps = Object.keys(package.dependencies || {});
    deps.forEach(name => {
      const modulePath = findParentModule(path.resolve(src, "..", name));
      copyModule(modulePath, path.resolve(findModulePath(dst), name));
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

exports.createChromeLayer = createChromeLayer;
