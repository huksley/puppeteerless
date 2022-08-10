# Puppeteerless

Running Chrome in AWS Lambda with Puppeteer to take screenshot and page content.

## Upgrading

Packages `chrome-aws-lambda` and `puppeteer-core` and `puppeteer` should have versions in sync.

## Running locally

> AWS_PROFILE=name SCREENSHOT_BUCKET=puppeteerless-public CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test

## Deploying to AWS

> AWS_PROFILE=name SCREENSHOT_BUCKET=puppeteerless-public CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run deploy

## Links

- https://github.com/alixaxel/chrome-aws-lambda/
