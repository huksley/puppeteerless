import "source-map-support/register";
import chromium from "chrome-aws-lambda";
import AWS from "aws-sdk";
import { APIGatewayEvent, Context } from "aws-lambda";
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

/** Creates a Base64-encoded ASCII string from a binary string */
export const btoa = (s: string) => Buffer.from(s, "binary").toString("base64");

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

export interface ScreenshotRequest {
  url?: string;
}

export interface ScreenshotResponse extends ScreenshotRequest {
  message: string;
  screenshotUrl?: string;
  title: string;
  browser: string;
}

const takeScreenshot = async (request: ScreenshotRequest): Promise<ScreenshotResponse> => {
  let url = new URL(request.url || "https://nytimes.com");

  // Load fonts
  const fontsDir = process.env.IS_LOCAL
    ? path.resolve(__dirname, "..", "..", "..", "layers", "fonts")
    : "/opt";
  const fonts = fs.readdirSync(fontsDir).filter(name => name.endsWith(".ttf"));
  logger.info("Loading fonts", fonts);
  await Promise.all(fonts.map(name => chromium.font(path.resolve(fontsDir, name))));

  const width = 1280;
  const height = 768;
  const executable = await chromium.executablePath;
  const args = chromium.args;
  logger.info("Launching Chrome", executable, "args", args);
  const browser = await chromium.puppeteer.launch({
    executablePath: executable,
    args,
    defaultViewport: { width, height },
    headless: chromium.headless,
    ignoreHTTPSErrors: true
  });

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

    logger.info("Opening url", url.toString());
    await page.goto(url.toString(), { timeout: 15000, waitUntil: "networkidle2" });

    const fullHeight = await scrollFullPage(page);
    await waitImages(page);
    if (page.waitForInflightRequests) {
      await page.waitForInflightRequests(0, 500, 500, {
        timeout: 3000
      });
    }

    const scale = await page.evaluate(height => {
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
    const fullPage = true;

    let buffer: Buffer | undefined = undefined; // await fullScreenshot(page);
    if (true) {
      let attempts = 0;
      while (attempts < 2) {
        try {
          //logger.info("Taking screenshot", url.toString(), "full height", fullHeight);
          //await page.setViewport({ width, height: fullHeight });
          buffer = (await page.screenshot(
            fullPage
              ? {
                  fullPage: true
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
          break;
        } catch (e) {
          logger.warn("Failed to get screenshot", e?.message || String(e), e);
          attempts++;
        }
      }
    }

    let title = await page.title();
    let screenshotUrl = undefined;
    const bucket = process.env.S3_BUCKET;
    if (buffer && bucket) {
      logger.info("Uploading to S3, title", '"' + title + '"');
      const s3result = await s3
        .upload({
          Bucket: bucket,
          Key:
            (process.env.S3_PREFIX ? process.env.S3_PREFIX + "/" : "") +
            new Date().getFullYear() +
            "/" +
            Date.now() +
            ".png",
          Body: buffer,
          ContentType: "image/png",
          ACL: "public-read",
          CacheControl: "public, max-age=" + 365 * 24 * 60 * 60 + ", immutable"
        })
        .promise();

      screenshotUrl = s3result.Location;
      logger.info("Uploaded S3 file", screenshotUrl);
    }

    const response: ScreenshotResponse = {
      ...request,
      message: buffer ? "Screenshot taken" : "Failed to get screenshot",
      screenshotUrl,
      title,
      browser: await page.browser().version()
    };

    await page.close();
    await browser.close();
    logger.info("Returning", response);
    return response;
  } catch (err) {
    logger.warn("Screenshot failed", err?.mesage || String(err));
    await browser.close();
    throw err;
  }
};

export const serverless = async (
  event?: APIGatewayEvent & {
    // For HTTP urls events
    requestContext?: {
      http?: {
        method?: string;
      };
    };
  },
  context?: Context
) => {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  logger.info("Got event", event);

  if (event?.requestContext?.http?.method === "GET" && !event?.queryStringParameters?.url) {
    const html = `<html>
  <head>
  <title>Screenshot</title>
  <link rel="stylesheet" type="text/css" href="https://githubraw.com/alvaromontoro/almond.css/master/dist/almond.css" />
  </head>
  <body>
    <h2>Take screenshot</h2>
    <p>
      <input type="text" id="url" value="https://techcrunch.com" onKeyDown="if (event.key === 'Enter') take()"/>
      <button onClick="take()">Screenshot</button>
    </p>
    <p id="value">Press <b>Screenshot</b></p>
  </div>
  <script>
  function take() {
    const url = document.getElementById("url").value
    document.getElementById("value").innerHTML = "Taking...";
    fetch("/screenshot?", {
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ url }) 
    }). 
      then(r => r.json()).
      then(json => document.getElementById("value").innerHTML = 
        "<h3>" + json.title + "</h3>" + 
        "<div><b>Browser " + json.browser + "</b></div>" + 
        "<div><a href='" + json.screenshotUrl + "'><img style='max-height: 80vh;' src='" + json.screenshotUrl + "'/></a></div>"
      ).
      catch(e => document.getElementById("value").innerHTML = "Error")
  }
  document.getElementById("url").focus();
  </script>
  </body>
  </html>`;
    return {
      statusCode: 200,
      isBase64Encoded: true,
      body: btoa(html),
      headers: {
        "Content-Type": "text/html"
      }
    };
  }

  let request: ScreenshotRequest = {};
  if (event?.body) {
    request = JSON.parse(event.body as string);
  } else if (event?.queryStringParameters?.url) {
    request = { url: event?.queryStringParameters?.url };
  }

  try {
    const response = await takeScreenshot(request);
    return {
      body: JSON.stringify(response),
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        "Content-Type": "application/json"
      }
    };
  } catch (e) {
    logger.warn("Screenshot failed", e);
    return {
      body: JSON.stringify({
        error: "Error " + e?.message ? e.message : String(e)
      }),
      statusCode: 500,
      isBase64Encoded: false,
      headers: {
        "Content-Type": "application/json"
      }
    };
  }
};

if (require.main === module) {
  takeScreenshot({
    url: "https://google.com/search?q=puppeteer"
  });
}
