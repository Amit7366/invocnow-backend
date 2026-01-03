import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: "Missing idToken" });
    }

    // ✅ Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) {
      return res.status(401).json({ success: false, message: "Invalid Google token" });
    }

    const email = payload.email;
    const name = payload.name || "Unknown";
    const googleId = payload.sub;

    // ✅ Upsert user (create if first time, update name if changed)
    const user = await User.findOneAndUpdate(
      { email }, // or { googleId }
      { email, name, googleId },
      { new: true, upsert: true }
    );

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ success: false, message: "JWT secret not configured" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, jwtSecret, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: { token, user },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
      error,
    });
  }
};
