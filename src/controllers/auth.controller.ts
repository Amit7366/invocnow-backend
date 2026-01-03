import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

export const googleAuth = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { email, name, googleId } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({ email, name, googleId });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: "JWT secret not configured",
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
      error,
    });
  }
};
