import { Page } from "puppeteer-core";

/**
 * Emulates UTC timezone.
 *
 * @param page - Page to hook to.
 */
export const emulateTimezone = (page: Page): Promise<Page> => {
  return page.emulateTimezone("UTC").then(() => page);
};
