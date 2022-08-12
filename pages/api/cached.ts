// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { logger } from "../../tools/logger";
import { takeScreenshot } from "../../src/takeScreenshot";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const url =
    process.env.NEXT_PUBLIC_SCREENSHOT_URL || process.env.NEXTAUTH_URL + "/api/screenshot";

  const request =
    req.method === "GET"
      ? {
          url: req.query.url
        }
      : req.body;

  logger.info("Query", url, "request", request);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  }).then(response => response.json());

  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate");
  return res.status(200).json({ ...response });
};

export default handler;
