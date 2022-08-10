import { Page } from "puppeteer-core";
import { logger } from "../tools/logger";
import { wait } from "./scroll";

export const waitImages = async (page: Page, timeout = 3000) => {
  let pending = 0;
  const started = Date.now();
  let timedout = false;
  do {
    pending = await page.evaluate(
      () => Array.from(document.images).filter(i => !i.complete).length
    );
    if (pending === 0) {
      break;
    }
    wait(20);
    timedout = Date.now() - started > timeout;
  } while (!timedout);

  if (timedout && pending) {
    logger.warn(
      "Timeout",
      Date.now() - started,
      "ms waiting for pending images",
      pending,
      "incomplete, document.readyState",
      await page.evaluate(() => document.readyState)
    );
  }

  return pending;
};
