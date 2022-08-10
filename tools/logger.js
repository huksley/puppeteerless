/**
 * @type VerboseConsole
 */
const logger = console;
exports.logger = logger;
/* eslint-disable @typescript-eslint/no-empty-function */
logger.verbose = process.env.LOG_VERBOSE === "1" ? logger.info : () => {};

exports.logger = logger;
