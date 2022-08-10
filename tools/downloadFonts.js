const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const logger = console;
exports.logger = logger;
/* eslint-disable @typescript-eslint/no-empty-function */
logger.verbose = process.env.LOG_VERBOSE === "1" ? logger.info : () => {};

/** Create fonts layer */
const downloadFonts = async rootDir => {
  const dir = path.resolve(rootDir, "layers/fonts");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const font = path.resolve(rootDir, "layers", "fonts", "NotoColorEmoji.ttf");
  if (!fs.existsSync(font)) {
    logger.verbose("Downloading", font);
    const response = await fetch(
      "https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf"
    );
    const buffer = await response.buffer();
    const s = fs.createWriteStream(font);
    s.write(buffer, () => s.close());
  }
};

exports.downloadFonts = downloadFonts;
