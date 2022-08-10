import { Page } from "puppeteer-core";
import { logger } from "../tools/logger";
import { wait } from "./scroll";
import Jimp from "jimp";

/** Merge images vertically, Copyright (C) https://github.com/PiPinecone/Image-Amalgamator/blob/main/src/index.js */
const mergeImages = async (imgs: Buffer[]) => {
  let finalWidth = 0;
  let finalHeight = 0;
  let heightArr = [0];

  // Calculate dimensions of final image and collect individual widths
  for (let i = 0; i < imgs.length; i++) {
    let image = await Jimp.read(imgs[i]);
    let height = image.bitmap.height;
    finalHeight += height;
    heightArr.push(finalHeight);

    let width = image.bitmap.width;
    if (width > finalWidth) {
      finalWidth = width;
    }
  }

  // Create a transparent image and paste images on top of it
  let back = new Jimp(finalWidth, finalHeight);
  for (let i = 0; i < imgs.length; i++) {
    back.blit(await Jimp.read(imgs[i]), 0, heightArr[i]);
  }

  return back.getBufferAsync("image/png");
};

/**
 * Takes full screenshot by taking view port sized areas and merging into the single image.
 * @link https://github.com/morteza-fsh/puppeteer-full-page-screenshot/blob/master/src/index.js
 **/
export const fullScreenshot = async (page: Page, maxHeight?: number) => {
  // Get the height of the rendered page
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  maxHeight =
    maxHeight === undefined ? bodyHeight : bodyHeight > maxHeight ? maxHeight : bodyHeight;
  const height = page.viewport()?.height || 768;
  const images: Buffer[] = [];

  // Scroll one viewport at a time, pausing to let content load
  let viewportPosition = 0;
  while (viewportPosition + height < maxHeight) {
    logger.info("Scroll", height, "pos", viewportPosition + height);
    await page.evaluate(increment => window.scrollBy(0, increment), height);
    await wait(20);
    viewportPosition = viewportPosition + height;
    images.push(
      (await page.screenshot({
        fullPage: false,
        captureBeyondViewport: false
      })) as Buffer
    );
  }

  return (await mergeImages(images)) as Buffer;
};
