import { Router } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config('../../.env.local'); // Load environment variables

// Configure AWS S3 Client
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS credentials are not set");
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const fileRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

fileRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "No file uploaded", statusCode: 404 });
    }

    const file = req.file;
    const fileKey = `uploads/${Date.now()}_${file.originalname}`;

    // Upload file to S3
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    };

    await s3.send(new PutObjectCommand(uploadParams));

    // Generate file URL
    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    return res.status(200).send({ url: imageUrl, statusCode: 200 });
  } catch (error) {
    return res.status(500).send({ message: "Something went wrong"+error, statusCode: 500 });
  }
});

export default fileRouter;
