import { Router } from "express";
import { requireProvider } from "../middleware/auth";

const router = Router();

// GET /api/events - Server-Sent Events (SSE)
router.get("/", requireProvider, async (req, res) => {
  // Configure headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send initial connection payload
  res.write(`data: ${JSON.stringify({ type: "connected", message: "SSE established" })}\n\n`);

  // Send periodic heartbeat to keep the connection alive on the client side
  const keepAliveInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "ping", timestamp: new Date().toISOString() })}\n\n`);
  }, 15000);

  // Cleanup resources when the client closes the connection
  req.on("close", () => {
    clearInterval(keepAliveInterval);
    res.end();
  });
});

export default router;
