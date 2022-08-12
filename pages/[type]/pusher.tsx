import Pusher from "pusher-js";
import { useEffect, useMemo } from "react";
import { ScreenshotResponse } from "../../src/takeScreenshot";
import { logger } from "../../tools/logger";

export const useScreenshotBroadcast = (
  onScreenshot?: (response: ScreenshotResponse) => void
) => {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PUSHER_API_KEY && process.env.NEXT_PUBLIC_PUSHER_CHANNEL) {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_API_KEY, {
        cluster: "eu"
      });

      const channel = pusher.subscribe(process.env.NEXT_PUBLIC_PUSHER_CHANNEL);
      logger.info("Connecting to Pusher channel", channel);
      channel.bind("screenshot", data => {
        if (onScreenshot) {
          onScreenshot(data);
        }
      });
    }
  }, [onScreenshot]);
};
