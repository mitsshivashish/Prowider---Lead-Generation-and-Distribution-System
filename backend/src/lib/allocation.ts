import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

/**
 * Allocation rules per spec:
 * Service 1 → mandatory: [1],    pool: [2,3,4]
 * Service 2 → mandatory: [5],    pool: [6,7,8]
 * Service 3 → mandatory: [1,4],  pool: [2,3,5,6,7,8]
 */
const RULES: Record<number, { mandatory: number[]; pool: number[] }> = {
  1: { mandatory: [1],    pool: [2, 3, 4] },
  2: { mandatory: [5],    pool: [6, 7, 8] },
  3: { mandatory: [1, 4], pool: [2, 3, 5, 6, 7, 8] },
};

async function selectAvailableProviders(
  tx: Prisma.TransactionClient,
  leadId: number,
  serviceId: number,
  count: number,
  excludeProviderIds: number[] = []
) {
  const rule = RULES[serviceId];
  if (!rule) throw new Error(`No allocation rule for serviceId ${serviceId}`);

  const existingAssignments = await tx.providerLead.findMany({
    where: { leadId },
    select: { providerId: true },
  });

  const excluded = new Set([
    ...excludeProviderIds,
    ...existingAssignments.map((assignment) => assignment.providerId),
  ]);

  const serviceCandidates = [...rule.mandatory, ...rule.pool].filter((providerId, index, all) =>
    all.indexOf(providerId) === index && !excluded.has(providerId)
  );

  const fallbackCandidates = (
    await tx.provider.findMany({
      where: { id: { notIn: Array.from(excluded) } },
      orderBy: { id: "asc" },
      select: { id: true },
    })
  ).map((provider) => provider.id);

  const candidateIds = [...serviceCandidates, ...fallbackCandidates].filter((providerId, index, all) =>
    all.indexOf(providerId) === index
  );

  const ranked = (
    await Promise.all(
      candidateIds.map(async (providerId) => {
        const provider = await tx.provider.findUnique({ where: { id: providerId } });
        if (!provider) return null;

        const used = await tx.providerLead.count({
          where: { providerId, assignedAt: { gte: provider.quotaResetDate } },
        });
        if (used >= provider.monthlyQuota) return null;

        const lastAssignment = await tx.providerLead.findFirst({
          where: { providerId, assignedAt: { gte: provider.quotaResetDate } },
          orderBy: { assignedAt: "desc" },
          select: { assignedAt: true },
        });

        return {
          providerId,
          monthlyCount: used,
          lastAssignedAt: lastAssignment?.assignedAt ?? new Date(0),
        };
      })
    )
  ).filter(Boolean) as { providerId: number; monthlyCount: number; lastAssignedAt: Date }[];

  return ranked
    .sort((a, b) =>
      a.monthlyCount !== b.monthlyCount
        ? a.monthlyCount - b.monthlyCount
        : a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime()
    )
    .slice(0, count)
    .map((candidate) => candidate.providerId);
}

/**
 * Cal.com-style fair allocation:
 * - Booking shortfall: provider most behind their equal share gets priority
 * - Tie-break: least recently assigned
 * - SERIALIZABLE transaction + pg_advisory_xact_lock prevents concurrent over-assignment
 */
export const allocateLeadToProviders = async (
  leadId: number,
  serviceId: number
): Promise<number[]> => {
  const rule = RULES[serviceId];
  if (!rule) throw new Error(`No allocation rule for serviceId ${serviceId}`);

  return prisma.$transaction(
    async (tx) => {
      // Use a global lock (1000) since provider quotas are shared across all services
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(1000)`);

      const allocated: number[] = [];

      // Step 1: Mandatory providers
      for (const providerId of rule.mandatory) {
        const provider = await tx.provider.findUnique({ where: { id: providerId } });
        if (!provider) continue;

        const used = await tx.providerLead.count({
          where: { providerId, assignedAt: { gte: provider.quotaResetDate } },
        });

        if (used < provider.monthlyQuota) {
          await tx.providerLead.create({
            data: { providerId, leadId },
            select: { id: true },
          });
          allocated.push(providerId);
        }
      }

      // Step 2: Fair pool — booking shortfall + least-recently-booked tie-break
      const slotsNeeded = 3 - allocated.length;
      const poolIds = rule.pool.filter((id) => !allocated.includes(id));

      for (let slot = 0; slot < slotsNeeded; slot++) {
        if (poolIds.length === 0) break;

        const candidates = [];
        for (const id of poolIds) {
          const provider = await tx.provider.findUnique({ where: { id } });
          if (!provider) continue;

          const used = await tx.providerLead.count({
            where: { providerId: id, assignedAt: { gte: provider.quotaResetDate } },
          });

          if (used < provider.monthlyQuota) {
            const poolRecord = await tx.fairAllocationPool.findUnique({
              where: { serviceId_providerId: { serviceId, providerId: id } },
            });
            const allocationCount = poolRecord?.allocationCount ?? 0;

            const lastAssignment = await tx.providerLead.findFirst({
              where: { providerId: id, assignedAt: { gte: provider.quotaResetDate } },
              orderBy: { assignedAt: "desc" },
            });

            candidates.push({
              providerId: id,
              allocationCount,
              lastAssignedAt: lastAssignment?.assignedAt ?? new Date(0),
            });
          }
        }

        if (candidates.length === 0) break;

        candidates.sort((a, b) => {
          if (a.allocationCount !== b.allocationCount) {
            return a.allocationCount - b.allocationCount;
          }
          return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
        });

        const selectedProviderId = candidates[0].providerId;

        await tx.providerLead.create({
          data: { providerId: selectedProviderId, leadId },
          select: { id: true },
        });

        await tx.fairAllocationPool.upsert({
          where: { serviceId_providerId: { serviceId, providerId: selectedProviderId } },
          create: { serviceId, providerId: selectedProviderId, allocationCount: 1 },
          update: { allocationCount: { increment: 1 } },
        });

        allocated.push(selectedProviderId);
        poolIds.splice(poolIds.indexOf(selectedProviderId), 1);
      }

      // Step 3: Global pool (if we still need more)
      if (allocated.length < 3) {
        const remainingNeeded = 3 - allocated.length;
        const fallbackIds = await selectAvailableProviders(tx, leadId, serviceId, remainingNeeded, allocated);

        for (const providerId of fallbackIds) {
          await tx.providerLead.create({
            data: { providerId, leadId },
            select: { id: true },
          });
          allocated.push(providerId);
        }
      }

      return allocated;
    },
    {
      maxWait: 50000, // 50 seconds to acquire a connection from the limited pool
      timeout: 60000, // 60 seconds to execute the transaction
    }
  );
};

export const reassignDisputedLeadToProviders = async (
  leadId: number,
  serviceId: number,
  excludedProviderIds: number[]
): Promise<number[]> => {
  return prisma.$transaction(
    async (tx) => {
      // Use the same global lock to prevent quota race conditions during reassignment
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(1000)`);
      
      const newProviderIds = await selectAvailableProviders(tx, leadId, serviceId, 1, excludedProviderIds);
      
      for (const providerId of newProviderIds) {
        await tx.providerLead.create({
          data: { providerId, leadId },
          select: { id: true },
        });
      }
      
      return newProviderIds;
    },
    {
      maxWait: 50000,
      timeout: 60000,
    }
  );
};