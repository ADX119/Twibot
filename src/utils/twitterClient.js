import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
dotenv.config();

export const client = new TwitterApi({
  appKey: process.env.API_KEY,
  appSecret: process.env.API_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

export const rwClient = client.readWrite;
