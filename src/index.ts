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
import { ScreenshotRequest, takeScreenshot } from "./takeScreenshot";
import { screenshotBroadcast } from "./screenshotBroadcast";

/** Creates a Base64-encoded ASCII string from a binary string */
export const btoa = (s: string) => Buffer.from(s, "binary").toString("base64");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "no-cache, no-store, max-age=0"
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

  // Also reply to CORS request
  if (event?.requestContext?.http?.method === "OPTIONS") {
    return {
      body: "",
      statusCode: 204,
      isBase64Encoded: false,
      headers: {
        ...cors
      }
    };
  }

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
        "<div><a href='" + json.screenshotUrl + "'><img style='max-width: 80vw;' src='" + json.screenshotUrl + "'/></a></div>"
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
    await screenshotBroadcast(response);
    return {
      body: JSON.stringify(response),
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        ...cors,
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
        ...cors,
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
