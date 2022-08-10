import { promises as fs } from "fs";
import { Page } from "puppeteer-core";
import fetch from "node-fetch";
import { Config, fullLists, PuppeteerBlocker } from "@cliqz/adblocker-puppeteer";
import { logger } from "../tools/logger";

const create = async (lists?: string[], options?: Partial<Config>) => {
  logger.verbose("Initialize adblocker, default lists", fullLists.length, "extra", lists);

  const b = await PuppeteerBlocker.fromLists(
    fetch,
    [...fullLists, ...(lists ? lists : [])],
    { enableCompression: false, ...options },
    {
      path: "/tmp/adblock.bin",
      read: fs.readFile,
      write: fs.writeFile
    }
  );

  return b;
};

let adblocker: PuppeteerBlocker;

/**
 * Enables ad blocking in page.
 * Requires `@cliqz/adblocker-puppeteer` package to be installed.
 *
 * @param page - Page to hook to.
 */
export const adblock = (lists?: string[], options?: Partial<Config>) =>
  async function (page: Page): Promise<Page> {
    if (!adblocker) {
      logger.info("Creating adblocker...");
      adblocker = await create(lists, options);
    }

    /**
     * FIXME: https://www.npmjs.com/package/@cliqz/adblocker-puppeteer depends on non-core package
     */
    type EnableBlockingInPage = (page: Page) => Promise<void>;
    return await (adblocker.enableBlockingInPage as unknown as EnableBlockingInPage)(
      page
    ).then(() => page);
  };
