import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
dotenv.config();

export const client = new TwitterApi({
  API_KEY: process.env.API_KEY,
  API_SECRET: process.env.API_SECRET,
  ACCESS_TOKEN: process.env.ACCESS_TOKEN,
  ACCESS_SECRET: process.env.ACCESS_SECRET,
});

export const rwClient = client.readWrite;
