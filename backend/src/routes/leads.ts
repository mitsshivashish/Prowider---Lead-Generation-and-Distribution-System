import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { allocateLeadToProviders, reassignDisputedLeadToProviders } from "../lib/allocation";
import { requireAdmin } from "../middleware/auth";
import { handleZodError, sendError, sendInternalServerError } from "../lib/errors";
import { COMPLETION_CONFIRMATION_WINDOW_HOURS, autoCompleteExpiredConfirmations } from "../lib/completion";

const router = Router();

// Validation schemas
const createLeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format").optional().or(z.null()),
  phoneNumber: z.string().regex(/^\+?1?\d{10,}$/, "Invalid phone number format"),
  city: z.string().min(2, "City must be at least 2 characters"),
  serviceId: z.number().int().positive("Service ID must be a positive integer"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  budget: z.number().positive("Budget must be positive").optional().or(z.null()),
  serviceDate: z.string().datetime().optional().or(z.null()),
});

const updateLeadSchema = z.object({
  status: z.enum(["pending", "viewed", "contacted"]),
});

const completionDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

const customerCompletionSchema = z.object({
  action: z.enum(["confirm", "dispute"]),
});

const getLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const getCustomerLeadsSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Create lead
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = createLeadSchema.parse(req.body);
    const { name, email, phoneNumber, city, serviceId, description, budget, serviceDate } = validatedData;

    const existingLead = await prisma.lead.findUnique({
      where: { phoneNumber_serviceId: { phoneNumber, serviceId } },
    });

    if (existingLead) {
      return sendError(res, 409, "A booking with this phone number already exists for this service");
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phoneNumber,
        city,
        serviceId,
        description,
        budget: budget ? budget.toString() : null,
        serviceDate: serviceDate || null,
        status: "pending",
      },
      include: { service: true },
    });

    const allocatedProviders = await allocateLeadToProviders(lead.id, serviceId);

    return res.status(201).json({ success: true, lead, allocatedProviders });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }
    if (error?.code === "P2002") {
      return sendError(res, 409, "A booking with this phone number already exists for this service");
    }
    sendInternalServerError(res, error);
  }
});

// Get all leads (requires authentication)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    await autoCompleteExpiredConfirmations();

    const validation = getLeadsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return handleZodError(res, validation.error);
    }

    const { page, limit } = validation.data;
    const skip = (page - 1) * limit;

    const [leads, total] = await prisma.$transaction([
      prisma.lead.findMany({
        skip,
        take: limit,
        include: {
          service: true,
          assignedProviders: {
            select: {
              id: true,
              providerId: true,
              leadId: true,
              assignedAt: true,
              status: true,
              completedAt: true,
              provider: {
                select: { id: true, name: true, email: true, monthlyQuota: true },
              },
            },
            orderBy: { assignedAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.count(),
    ]);

    return res.json({
      data: leads,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendInternalServerError(res, error);
  }
});

// Get customer leads (Public facing, uses email as simple auth for prototype)
router.get("/customer", async (req: Request, res: Response) => {
  try {
    const validation = getCustomerLeadsSchema.safeParse(req.query);
    if (!validation.success) {
      return handleZodError(res, validation.error);
    }

    const { email } = validation.data;
    
    const leads = await prisma.lead.findMany({
      where: { email },
      include: {
        service: true,
        assignedProviders: {
          select: {
            id: true,
            providerId: true,
            leadId: true,
            assignedAt: true,
            status: true,
            provider: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, leads });
  } catch (error) {
    sendInternalServerError(res, error);
  }
});

// Customer confirms completion or raises a dispute. In production this should be token-protected.
router.patch("/:id/providers/:providerId/customer-confirmation", async (req: Request, res: Response) => {
  try {
    const leadId = Number(req.params.id);
    const providerId = Number(req.params.providerId);
    if (!Number.isInteger(leadId) || leadId <= 0 || !Number.isInteger(providerId) || providerId <= 0) {
      return sendError(res, 400, "Invalid lead or provider ID");
    }

    const { action } = customerCompletionSchema.parse(req.body);

    const assignment = await prisma.providerLead.findUnique({
      where: { providerId_leadId: { providerId, leadId } },
      select: { status: true, lead: true },
    });

    if (!assignment) {
      return sendError(res, 404, "Provider assignment not found");
    }

    if (assignment.status !== "pending_customer_confirmation") {
      return sendError(res, 409, "This assignment is not waiting for customer confirmation");
    }

    const result = await prisma.$transaction(async (tx) => {
      const providerLead = await tx.providerLead.update({
        where: { providerId_leadId: { providerId, leadId } },
        data:
          action === "confirm"
            ? { status: "completed", completedAt: new Date() }
            : { status: "disputed", completedAt: null },
        select: {
          id: true,
          providerId: true,
          leadId: true,
          assignedAt: true,
          status: true,
          completedAt: true,
          provider: { select: { id: true, name: true, email: true } },
          lead: { include: { service: true } },
        },
      });

      const lead = await tx.lead.update({
        where: { id: leadId },
        data: { status: action === "confirm" ? "completed" : "disputed" },
        include: { service: true },
      });

      // If a customer confirms completion, mark the lead as completed for all other assigned providers as well.
      // This closes the opportunity for everyone.
      if (action === "confirm") {
        await tx.providerLead.updateMany({
          where: {
            leadId: leadId,
            providerId: { not: providerId },
          },
          data: { status: "completed" },
        });
      }

      return { providerLead, lead };
    });

    return res.json({
      success: true,
      action,
      confirmationWindowHours: COMPLETION_CONFIRMATION_WINDOW_HOURS,
      completedByProvider: action === "confirm" ? result.providerLead.provider : null,
      lead: result.lead,
      assignment: result.providerLead,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }
    sendInternalServerError(res, error);
  }
});

// Admin resolves only customer-disputed completion requests
router.patch("/:id/providers/:providerId/completion", requireAdmin, async (req: Request, res: Response) => {
  try {
    const leadId = Number(req.params.id);
    const providerId = Number(req.params.providerId);
    if (!Number.isInteger(leadId) || leadId <= 0 || !Number.isInteger(providerId) || providerId <= 0) {
      return sendError(res, 400, "Invalid lead or provider ID");
    }

    const { action } = completionDecisionSchema.parse(req.body);

    const assignment = await prisma.providerLead.findUnique({
      where: { providerId_leadId: { providerId, leadId } },
      select: { status: true, lead: true },
    });

    if (!assignment) {
      return sendError(res, 404, "Provider assignment not found");
    }

    if (assignment.status !== "disputed") {
      return sendError(res, 409, "Only disputed completions can be resolved by admin");
    }

    if (action === "reject") {
      const rejectedAssignment = await prisma.providerLead.update({
        where: { providerId_leadId: { providerId, leadId } },
        data: { status: "rejected", completedAt: null },
        select: {
          id: true,
          providerId: true,
          leadId: true,
          assignedAt: true,
          status: true,
          completedAt: true,
          provider: { select: { id: true, name: true, email: true } },
          lead: { include: { service: true } },
        },
      });

      await prisma.lead.update({
        where: { id: leadId },
        data: { status: "disputed" },
      });

      const reassignedProviderIds = await reassignDisputedLeadToProviders(leadId, assignment.lead.serviceId, [providerId]);

      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          service: true,
          assignedProviders: {
            select: {
              id: true,
              providerId: true,
              leadId: true,
              assignedAt: true,
              status: true,
              completedAt: true,
              provider: { select: { id: true, name: true, email: true, monthlyQuota: true } },
            },
            orderBy: { assignedAt: "asc" },
          },
        },
      });

      return res.json({
        success: true,
        action,
        reassignedProviderIds,
        completedByProvider: null,
        lead,
        assignment: rejectedAssignment,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const providerLead = await tx.providerLead.update({
        where: { providerId_leadId: { providerId, leadId } },
        data: { status: "pending_customer_confirmation", completedAt: null },
        select: {
          id: true,
          providerId: true,
          leadId: true,
          assignedAt: true,
          status: true,
          completedAt: true,
          provider: { select: { id: true, name: true, email: true } },
          lead: { include: { service: true } },
        },
      });

      const lead = await tx.lead.update({
        where: { id: leadId },
        data: { status: "pending_confirmation" },
        include: { service: true },
      });

      return { providerLead, lead };
    });

    return res.json({
      success: true,
      action,
      completedByProvider: null,
      lead: result.lead,
      assignment: result.providerLead,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }
    sendInternalServerError(res, error);
  }
});

// Update lead status
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return sendError(res, 400, "Invalid lead ID");
    }

    const { status } = updateLeadSchema.parse(req.body);

    const lead = await prisma.lead.update({
      where: { id },
      data: { status },
      include: { service: true },
    });

    return res.json(lead);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }
    if (error?.code === "P2025") {
      return sendError(res, 404, "Lead not found");
    }
    sendInternalServerError(res, error);
  }
});

// Delete lead
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return sendError(res, 400, "Invalid lead ID");
    }

    await prisma.lead.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return sendError(res, 404, "Lead not found");
    }
    sendInternalServerError(res, error);
  }
});

export default router;
