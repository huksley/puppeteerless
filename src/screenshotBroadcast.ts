import Pusher from "pusher";
import { logger } from "../tools/logger";
import { ScreenshotResponse } from "./takeScreenshot";

export const screenshotBroadcast = (response: ScreenshotResponse) => {
  if (process.env.NEXT_PUBLIC_PUSHER_API_KEY) {
    const pusher = new Pusher({
      appId: "1462257",
      key: process.env.NEXT_PUBLIC_PUSHER_API_KEY,
      secret: process.env.PUSHER_SECRET_KEY || "test",
      cluster: "eu",
      useTLS: true
    });

    logger.info("Sending message to Pusher...");
    return pusher.trigger(
      process.env.NEXT_PUBLIC_PUSHER_CHANNEL || "test",
      "screenshot",
      response
    );
  } else {
    return Promise.resolve();
  }
};
