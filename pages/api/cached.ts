// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "@huksley/request";
import { logger } from "../../tools/logger";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const url =
    process.env.NEXT_PUBLIC_SCREENSHOT_URL || process.env.NEXTAUTH_URL + "/api/screenshot";

  const payload =
    req.method === "GET"
      ? {
          url: req.query.url
        }
      : req.body;

  logger.info("Query", url, "request", request);

  const response = await request<{ screenshotUrl?: string }>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }).then(response => response.body);

  /*
  const response = {
    screenshotUrl:
      "http://puppeteerless-public.localhost:9000/puppeteerless-public/2022/1660321678646.png"
  };*/

  if (response.screenshotUrl) {
    // Cache only if got screenshot
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate");
  }

  return res.status(200).json({ ...response });
};

export default handler;
