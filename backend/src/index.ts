// Load env first — before ANY other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import leadsRouter from "./routes/leads";
import providersRouter from "./routes/providers";
import webhookRouter from "./routes/webhook";
import eventsRouter from "./routes/events";
import authRouter from "./routes/auth";
import servicesRouter from "./routes/services";

// 1. Enhanced Environment Validation on Startup
const requiredEnvVars = ["DATABASE_URL", "PROVIDER_AUTH_SECRET", "ADMIN_TOKEN"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`[WARNING] Required environment variable missing: ${envVar}`);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// 1.5 Trust the reverse proxy (Render, Railway, AWS, etc.) so rate limiting works correctly
app.set("trust proxy", 1);

// Safely handle trailing slashes in the environment variable to prevent CORS errors
const safeFrontendUrl = FRONTEND_URL.endsWith("/") ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL;

// Restrict CORS to frontend URL only
app.use(cors({
  origin: safeFrontendUrl,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// 2. Add Request Logging/Tracing Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Rate limiting for webhook endpoint
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many webhook requests",
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter for all other routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", apiLimiter, authRouter);
app.use("/api/services", apiLimiter, servicesRouter);
app.use("/api/leads", apiLimiter, leadsRouter);
app.use("/api/providers", apiLimiter, providersRouter);
app.use("/api/webhook", webhookLimiter, webhookRouter);
app.use("/api/events", apiLimiter, eventsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? "loaded ✓" : "MISSING ✗"}`);
});

export default app;
