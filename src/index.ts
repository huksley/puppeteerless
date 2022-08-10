import "source-map-support/register";
import chromium from "chrome-aws-lambda";
import AWS from "aws-sdk";

import { APIGatewayEvent, Context } from "aws-lambda";
import emulateTimezone from "chrome-aws-lambda/build/hooks/timezone";
import fixOuterWidthHeight from "chrome-aws-lambda/build/hooks/window";
import fixChrome from "chrome-aws-lambda/build/hooks/chrome";
import * as fs from "fs";
import * as path from "path";

type VerboseConsole = Console & { verbose: (str: string, ...any: unknown[]) => void };
const logger: VerboseConsole = console as unknown as VerboseConsole;
/* eslint-disable @typescript-eslint/no-empty-function */
logger.verbose = process.env.LOG_VERBOSE === "1" ? logger.info : () => {};

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
  let url = new URL(request.url || "https://google.com/search?q=puppeteer");

  // Load fonts
  const fontsDir = process.env.IS_LOCAL
    ? path.resolve(__dirname, "..", "..", "..", "layers", "fonts")
    : "/opt";
  const fonts = fs.readdirSync(fontsDir).filter(name => name.endsWith(".ttf"));
  logger.info("Loading fonts", fonts);
  await Promise.all(fonts.map(name => chromium.font(path.resolve(fontsDir, name))));

  const executable = process.env.CHROME || (await chromium.executablePath);
  const args = chromium.args;
  logger.info("Launching Chrome", executable, "args", args);
  const browser = await chromium.puppeteer.launch({
    executablePath: executable,
    args,
    defaultViewport: { width: 1280, height: 768 },
    headless: chromium.headless,
    ignoreHTTPSErrors: true
  });

  logger.verbose("Opening new page");
  const page = await browser.newPage(emulateTimezone, fixOuterWidthHeight, fixChrome);

  page.on("console", msg => {
    msg.args().forEach((arg, i) => logger.info("Console log", i, String(arg)));
  });

  logger.info("Opening url", url.toString());
  await page.goto(url.toString(), { timeout: 3000, waitUntil: "networkidle2" });

  let buffer = null;
  try {
    logger.info("Taking screenshot", url.toString());
    buffer = (await page.screenshot()) as Buffer;
  } catch (e) {
    logger.warn("Failed to get screenshot", e?.message || String(e), e);
  }

  let title = await page.title();
  let screenshotUrl = undefined;
  const bucket = process.env.S3_BUCKET;
  if (buffer && bucket) {
    logger.info("Uploading to S3, title", '"' + title + '"');
    const s3result = await s3
      .upload({
        Bucket: bucket,
        Key: (process.env.S3_PREFIX || "") + Date.now() + ".png",
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
