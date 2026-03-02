import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
dotenv.config();

const requiredEnvVars = [
  "API_KEY",
  "API_SECRET",
  "ACCESS_TOKEN",
  "ACCESS_SECRET",
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required Twitter env vars: ${missingEnvVars.join(", ")}`
  );
}

export const client = new TwitterApi({
  appKey: process.env.API_KEY,
  appSecret: process.env.API_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

export const rwClient = client.readWrite;
