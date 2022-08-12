// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { takeScreenshot } from "../../src/takeScreenshot";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const result = await takeScreenshot(req.body);
  const s = res.status(200).json({ ...result });
};

export default handler;
