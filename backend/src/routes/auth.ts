import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, comparePassword, signProviderToken } from "../lib/provider-token";
import { requireProvider } from "../middleware/auth";
import { handleZodError, sendError, sendInternalServerError } from "../lib/errors";
import rateLimit from "express-rate-limit";

const router = Router();

// Strict rate limiting for login endpoints to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per windowMs
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const requestCompletionSchema = z.object({
  note: z.string().optional(),
});

// Admin login endpoint
router.post("/admin/login", loginLimiter, (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminEmail || !adminPassword || !adminToken) {
      return sendError(res, 500, "Admin credentials not configured");
    }

    if (email !== adminEmail || password !== adminPassword) {
      return sendError(res, 401, "Invalid email or password");
    }

    // Set secure httpOnly cookie with token
    res.cookie("prowider_admin_token", adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.json({ token: adminToken, admin: { email } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }
    sendInternalServerError(res, error);
  }
});

// Verify admin session
router.get("/admin/me", (req: Request, res: Response) => {
  const token = req.cookies.prowider_admin_token;
  const adminToken = process.env.ADMIN_TOKEN;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!token || token !== adminToken) {
    return sendError(res, 401, "Unauthorized");
  }

  return res.json({ email: adminEmail });
});

// Provider login endpoint
router.post("/provider/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);

    const provider = await prisma.provider.findUnique({ where: { email } });
    if (!provider) {
      return sendError(res, 401, "Invalid email or password");
    }

    // Use async password comparison
    const passwordValid = await comparePassword(password, provider.password);
    if (!passwordValid) {
      return sendError(res, 401, "Invalid email or password");
    }

    const token = signProviderToken(provider.id);

    // Set secure httpOnly cookie with token
    res.cookie("prowider_provider_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.json({
      token,
      provider: { id: provider.id, name: provider.name, email: provider.email },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }
    sendInternalServerError(res, error);
  }
});

// Get provider profile
router.get("/provider/me", requireProvider, async (req: Request, res: Response) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: req.providerId! },
    });

    if (!provider) {
      return sendError(res, 404, "Provider not found");
    }

    const leadsCount = await prisma.providerLead.count({
      where: { providerId: provider.id, assignedAt: { gte: provider.quotaResetDate } },
    });

    return res.json({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      monthlyQuota: provider.monthlyQuota,
      leadsCount,
      remainingQuota: provider.monthlyQuota - leadsCount,
    });
  } catch (error) {
    sendInternalServerError(res, error);
  }
});

// Get provider's assigned leads
router.get("/provider/me/leads", requireProvider, async (req: Request, res: Response) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: req.providerId! },
    });

    if (!provider) {
      return sendError(res, 404, "Provider not found");
    }

    const assignedLeads = await prisma.providerLead.findMany({
      where: { providerId: provider.id },
      select: {
        id: true,
        providerId: true,
        leadId: true,
        assignedAt: true,
        status: true,
        completionNote: true,
        completionRequestedAt: true,
        completedAt: true,
        lead: { include: { service: true } },
      },
      orderBy: { assignedAt: "desc" },
    });

    return res.json({
      leads: assignedLeads.map((pl) => ({
        ...pl.lead,
        assignedAt: pl.assignedAt,
        assignmentStatus: pl.status,
        completionNote: pl.completionNote,
        completionRequestedAt: pl.completionRequestedAt,
        completedAt: pl.completedAt,
      })),
    });
  } catch (error) {
    sendInternalServerError(res, error);
  }
});

// Request lead completion
router.post("/provider/me/leads/:leadId/request-completion", requireProvider, async (req: Request, res: Response) => {
  try {
    const leadId = Number(req.params.leadId);
    if (!Number.isInteger(leadId) || leadId <= 0) {
      return sendError(res, 400, "Invalid lead ID");
    }

    const { note } = requestCompletionSchema.parse(req.body);

    const assignment = await prisma.providerLead.findUnique({
      where: { providerId_leadId: { providerId: req.providerId!, leadId } },
    });

    if (!assignment) {
      return sendError(res, 404, "Assignment not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.providerLead.update({
        where: { providerId_leadId: { providerId: req.providerId!, leadId } },
        data: {
          status: "pending_customer_confirmation",
          completionNote: note,
          completionRequestedAt: new Date(),
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: { status: "pending_confirmation" },
      });
    });

    return res.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }
    sendInternalServerError(res, error);
  }
});

// Logout endpoint
router.post("/logout", (req: Request, res: Response) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" as const : "strict" as const,
  };
  res.clearCookie("prowider_admin_token", cookieOptions);
  res.clearCookie("prowider_provider_token", cookieOptions);
  return res.json({ message: "Logged out successfully" });
});

export default router;
