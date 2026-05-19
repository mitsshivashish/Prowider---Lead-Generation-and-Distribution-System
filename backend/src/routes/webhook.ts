import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// Validation schema
const webhookSchema = z.object({
  providerId: z.number().int().positive(),
  idempotencyKey: z.string().min(1),
  action: z.enum(["reset_quota"]),
});

// Webhook endpoint - requires admin authentication
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    // Validate webhook payload
    const data = webhookSchema.parse(req.body);
    const { providerId, idempotencyKey, action } = data;

    // Atomic idempotency: check + action + record in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.webhookCall.findUnique({
        where: { providerId_idempotencyKey: { providerId, idempotencyKey } },
      });

      if (existing?.status === "completed") {
        return { alreadyProcessed: true };
      }

      if (action === "reset_quota") {
        const provider = await tx.provider.findUnique({ where: { id: providerId } });
        if (!provider) throw new Error("PROVIDER_NOT_FOUND");

        await tx.provider.update({
          where: { id: providerId },
          data: { quotaResetDate: new Date() },
        });
      }

      await tx.webhookCall.upsert({
        where: { providerId_idempotencyKey: { providerId, idempotencyKey } },
        update: { status: "completed" },
        create: { providerId, idempotencyKey, action, status: "completed" },
      });

      return { alreadyProcessed: false };
    });

    return res.json({
      success: true,
      message: result.alreadyProcessed
        ? "Webhook already processed"
        : `${action} processed successfully`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    if (error?.message === "PROVIDER_NOT_FOUND") {
      return res.status(404).json({ error: "Provider not found" });
    }
    if (error?.code === "P2002") {
      return res.json({ success: true, message: "Webhook already processed" });
    }
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
