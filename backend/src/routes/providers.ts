import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { sendError, sendInternalServerError } from "../lib/errors";

const router = Router();

// Get all providers (requires admin authentication)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const providers = await prisma.provider.findMany({
      orderBy: { id: "asc" },
    });

    const today = new Date(new Date().setHours(0, 0, 0, 0));

    const providersWithStats = await Promise.all(
      providers.map(async (provider) => {
        const [leadsThisQuotaPeriod, leadsToday] = await Promise.all([
          prisma.providerLead.count({
            where: {
              providerId: provider.id,
              assignedAt: { gte: provider.quotaResetDate },
            },
          }),
          prisma.providerLead.count({
            where: {
              providerId: provider.id,
              assignedAt: { gte: today },
            },
          }),
        ]);

        return {
          ...provider,
          leadsCount: leadsThisQuotaPeriod,
          leadsToday,
          remainingQuota: provider.monthlyQuota - leadsThisQuotaPeriod,
        };
      })
    );

    return res.json(providersWithStats);
  } catch (error) {
    sendInternalServerError(res, error);
  }
});

// Get provider details (requires admin authentication)
router.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const providerId = Number(req.params.id);
    if (!Number.isInteger(providerId) || providerId <= 0) {
      return sendError(res, 400, "Invalid provider ID");
    }

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return sendError(res, 404, "Provider not found");
    }

    // Calculate quota usage specifically for the current billing cycle
    const leadsCount = await prisma.providerLead.count({
      where: {
        providerId,
        assignedAt: { gte: provider.quotaResetDate },
      },
    });

    // Fetch ALL historical leads for the table
    const assignedLeads = await prisma.providerLead.findMany({
      where: {
        providerId,
      },
      select: {
        id: true,
        providerId: true,
        leadId: true,
        assignedAt: true,
        status: true,
        completedAt: true,
        lead: { include: { service: true } },
      },
      orderBy: { assignedAt: "desc" },
    });

    return res.json({
      provider: {
        id: provider.id,
        name: provider.name,
        email: provider.email,
        monthlyQuota: provider.monthlyQuota,
      },
      leadsCount,
      remainingQuota: provider.monthlyQuota - leadsCount,
      leads: assignedLeads.map((pl) => ({
        ...pl.lead,
        assignedAt: pl.assignedAt,
        assignmentStatus: pl.status,
        completedAt: pl.completedAt,
      })),
    });
  } catch (error) {
    sendInternalServerError(res, error);
  }
});

export default router;
