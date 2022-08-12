import AWS from "aws-sdk";
import { logger } from "../tools/logger";

const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  ...(process.env.S3_MINIO === "1"
    ? {
        endpoint: "http://localhost:9000",
        region: "us-east-1",
        credentials: {
          accessKeyId: process.env.MINIO_ACCESS_KEY || "test",
          secretAccessKey: process.env.MINIO_SECRET_KEY || "ohgoo4iHiamejohl"
        }
      }
    : {})
});

export const uploadScreenshot = async (buffer: Buffer) => {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    return undefined;
  }

  try {
    logger.info("Create bucket", bucket);
    await s3
      .createBucket({
        Bucket: bucket,
        ACL: "public-read"
      })
      .promise()
      .then(result => {
        logger.info("Created bucket", result);
      })
      .catch(err => {
        logger.warn("Bucket creation failed", err?.message);
      });

    logger.info("Uploading to S3, title", buffer.length, "bytes");
    const s3result = await s3
      .upload({
        Bucket: bucket,
        Key:
          bucket +
          "/" +
          (process.env.S3_PREFIX ? process.env.S3_PREFIX + "/" : "") +
          new Date().getFullYear() +
          "/" +
          Date.now() +
          ".png",
        Body: buffer,
        ContentType: "image/png",
        ACL: "public-read",
        CacheControl: "public, max-age=" + 365 * 24 * 60 * 60 + ", immutable"
      })
      .promise();

    return s3result.Location;
  } catch (err) {
    logger.warn("Failed to upload screenshot", err);
    return undefined;
  }
};
