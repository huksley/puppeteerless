// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "@huksley/request";
import { logger } from "../../tools/logger";
import path from "path";
import { readFileSync } from "fs";

/**
 * Invoke screenshot API with Cache-Control header so it can be cached by Vercel.
 * @see https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#cache-control
 */
export default async (req: NextApiRequest, res: NextApiResponse) => {
  const url =
    process.env.NEXT_PUBLIC_SCREENSHOT_URL || process.env.NEXTAUTH_URL + "/api/screenshot";

  const payload =
    req.method === "GET"
      ? {
          url: req.query.url
        }
      : req.body;

  const canned = process.env.CACHED_CANNED_RESPONSE;
  if (canned) {
    const cannedFile = path.resolve(process.cwd(), canned);
    logger.verbose("Reading", cannedFile);
    const json = JSON.parse(readFileSync(cannedFile, { encoding: "utf-8" }));
    return setTimeout(() => {
      res.status(200).json(json);
    }, 500 + Math.random() * 500);
  } else {
    logger.info("Query", url, "request", request);
    const response = await request<{ screenshotUrl?: string }>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).then(response => response.body);

    if (response.screenshotUrl) {
      // Cache only if got screenshot
      res.setHeader(
        "Cache-Control",
        "s-maxage=" + (process.env.CACHE_MAXAGE || "864000") + ", stale-while-revalidate"
      );
    }

    return res.status(200).json({ ...response });
  }
};
