import { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export const COMPLETION_CONFIRMATION_WINDOW_HOURS = 6;

const windowMs = COMPLETION_CONFIRMATION_WINDOW_HOURS * 60 * 60 * 1000;

export async function autoCompleteExpiredConfirmations(client: PrismaClient = prisma) {
  const expiresBefore = new Date(Date.now() - windowMs);

  const expiredAssignments = await client.providerLead.findMany({
    where: {
      status: "pending_customer_confirmation",
      completionRequestedAt: { lte: expiresBefore },
    },
    select: { leadId: true, providerId: true },
  });

  if (expiredAssignments.length === 0) {
    return 0;
  }

  await client.$transaction(async (tx) => {
    for (const assignment of expiredAssignments) {
      await tx.providerLead.update({
        where: {
          providerId_leadId: {
            providerId: assignment.providerId,
            leadId: assignment.leadId,
          },
        },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });

      await tx.lead.update({
        where: { id: assignment.leadId },
        data: { status: "completed" },
      });
    }
  });

  return expiredAssignments.length;
}
