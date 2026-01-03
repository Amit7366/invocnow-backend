import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app";
import { connectDB } from "../src/config/db";

let isConnected = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return app(req as any, res as any);
}
