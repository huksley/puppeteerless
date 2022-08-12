// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { takeScreenshot } from "../../src/takeScreenshot";
import { screenshotBroadcast } from "../../src/screenshotBroadcast";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const response = await takeScreenshot(req.body);
  await screenshotBroadcast(response);
  const s = res.status(200).json({ ...response });
};

export default handler;
