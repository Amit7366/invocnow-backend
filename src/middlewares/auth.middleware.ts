// requireGoogleAuth.ts
import { OAuth2Client } from "google-auth-library";
import type { Request, Response, NextFunction } from "express";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function requireGoogleAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing token" });

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub) return res.status(401).json({ message: "Invalid token" });

    // ✅ match IUserPayload shape (id is required)
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name, // ✅ add this
    } as any;

    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
