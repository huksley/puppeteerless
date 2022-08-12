import "source-map-support/register";
import chromium from "chrome-aws-lambda";
import emulateTimezone from "chrome-aws-lambda/build/hooks/timezone";
import fixOuterWidthHeight from "chrome-aws-lambda/build/hooks/window";
import fixChrome from "chrome-aws-lambda/build/hooks/chrome";
import { logger } from "../tools/logger";
import * as fs from "fs";
import * as path from "path";
import { adblock } from "./adblock";
import { scrollFullPage, wait } from "./scroll";
import { waitImages } from "./waitImages";
import { fullScreenshot } from "./fullScreenshot";
import { Browser } from "puppeteer-core";
import { removeConsent } from "./removeConsent";
import { Newspaper } from "./newspaper";
import { uploadScreenshot } from "./uploadScreenshot";

/** Creates a Base64-encoded ASCII string from a binary string */
export const btoa = (s: string) => Buffer.from(s, "binary").toString("base64");

export interface ScreenshotRequest {
  url?: string;
}

export interface ScreenshotResponse extends ScreenshotRequest {
  message: string;
  screenshotUrl?: string;
  title: string;
  browser: string;
}

export const takeScreenshot = async (
  request: ScreenshotRequest
): Promise<ScreenshotResponse> => {
  let url = new URL(request.url || "https://nytimes.com");
  let browser: Browser | undefined = undefined;
  if (!browser) {
    // Load fonts
    const fontsDir = process.env.IS_LOCAL
      ? path.resolve(__dirname, "..", "..", "..", "layers", "fonts")
      : "/opt";
    const fonts = fs.readdirSync(fontsDir).filter(name => name.endsWith(".ttf"));
    logger.info("Loading fonts", fonts);
    await Promise.all(fonts.map(name => chromium.font(path.resolve(fontsDir, name))));

    const executable = await chromium.executablePath;
    const args = chromium.args;
    logger.info("Launching Chrome", executable, "args", args);
    browser = await chromium.puppeteer.launch({
      executablePath: executable,
      args,
      headless: chromium.headless || true,
      ignoreHTTPSErrors: true
    });
  }

  try {
    logger.verbose("Opening new page");
    const page = await browser.newPage(
      emulateTimezone,
      fixOuterWidthHeight,
      fixChrome,
      adblock([])
    );

    page.on("console", msg => {
      msg.args().forEach((arg, i) => logger.info("Console log", i, String(arg)));
    });

    const width = 1280;
    const height = 768;
    await page.setViewport({ width, height });
    logger.info("Opening url", url.toString());
    await page.goto(url.toString(), { timeout: 15000, waitUntil: "networkidle2" });
    await removeConsent(page);
    const fullHeight = await scrollFullPage(page);
    await waitImages(page);

    if (page.waitForInflightRequests) {
      try {
        await page.waitForInflightRequests(0, 500, 500, {
          timeout: 3000
        });
      } catch (err) {
        logger.warn("Failed waitForInflightRequests", err);
      }
    }

    let scale = 1;
    try {
      scale = await page.evaluate(height => {
        const body = document.body;
        // Scale whole body to fit to height of view port
        const scale = (height * 1.0) / document.body.scrollHeight;
        body.style.transform = "scale(" + scale + ")";
        body.style.transformOrigin = "0 0";
        return scale;
      }, height);

      await page.evaluate(() => {
        const body = document.body;
        body.style.transform = "";
      });
    } catch (err) {
      logger.warn("Failed page scale", err);
    }

    const fullPage = true;
    let buffer: Buffer | undefined = undefined; // await fullScreenshot(page);

    try {
      //logger.info("Taking screenshot", url.toString(), "full height", fullHeight);
      //await page.setViewport({ width, height: fullHeight });
      buffer = (await page.screenshot(
        fullPage
          ? {
              clip: {
                x: 0,
                y: 0,
                width,
                height: width * Newspaper.Berliner
              },
              captureBeyondViewport: true
            }
          : {
              clip: {
                x: 0,
                y: 0,
                width: width * scale,
                height
              },
              fullPage: false,
              captureBeyondViewport: false
            }
      )) as Buffer;
    } catch (e) {
      logger.warn("Failed to get screenshot", e?.message || String(e), e);
    }

    let title = await page.title();
    let screenshotUrl = buffer ? await uploadScreenshot(buffer) : undefined;

    const response: ScreenshotResponse = {
      ...request,
      message: buffer ? "Screenshot taken" : "Failed to get screenshot",
      screenshotUrl,
      title,
      browser: await page.browser().version()
    };

    await page.close();
    logger.info("Returning", response);
    return response;
  } catch (err) {
    logger.warn("Screenshot failed", err?.mesage || String(err));
    throw err;
  } finally {
    try {
      browser.close();
    } catch (e) {
      logger.warn("Failed to close browser", e);
    }
  }
};
