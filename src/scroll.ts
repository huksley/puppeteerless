import { Page } from "puppeteer-core";
import { logger } from "../tools/logger";

export const wait = (ms: number) => {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
};

/**
 * Fix loading for screenshot from here
 * https://www.screenshotbin.com/blog/handling-lazy-loaded-webpages-puppeteer
 **/
export const scrollFullPage = async (page: Page, maxHeight?: number) => {
  // Get the height of the rendered page
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  maxHeight =
    maxHeight === undefined ? bodyHeight : bodyHeight > maxHeight ? maxHeight : bodyHeight;
  const height = page.viewport()?.height || 768;

  // Scroll one viewport at a time, pausing to let content load
  let viewportPosition = 0;
  while (viewportPosition + height < maxHeight) {
    logger.info("Scroll", height, "pos", viewportPosition + height);
    await page.evaluate(increment => window.scrollBy(0, increment), height);
    await wait(20);
    viewportPosition = viewportPosition + height;
  }

  // Scroll back to top
  logger.info("Scroll to top");
  await page.evaluate(() => window.scrollTo(0, 0));
  return viewportPosition;
};
