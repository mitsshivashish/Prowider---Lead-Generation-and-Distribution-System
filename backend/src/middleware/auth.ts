import { Request, Response, NextFunction } from "express";
import { verifyProviderToken } from "../lib/provider-token";

declare global {
  namespace Express {
    interface Request {
      providerId?: number;
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "ADMIN_TOKEN not configured" });
  }

  // Try to get token from Authorization header first, then from cookie
  let authToken = req.headers.authorization?.replace("Bearer ", "");
  if (!authToken) {
    authToken = req.cookies?.prowider_admin_token;
  }

  if (!authToken || authToken !== token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

export function requireProvider(req: Request, res: Response, next: NextFunction) {
  // Try to get token from Authorization header first, then from cookie
  let auth = req.headers.authorization;
  let token: string | undefined;

  if (auth?.startsWith("Bearer ")) {
    token = auth.slice(7);
  } else {
    token = req.cookies?.prowider_provider_token;
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const providerId = verifyProviderToken(token);
  if (!providerId) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.providerId = providerId;
  next();
}
