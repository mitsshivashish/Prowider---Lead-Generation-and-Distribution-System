import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/provider-token";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.providerLead.deleteMany();
  await prisma.webhookCall.deleteMany();
  await prisma.fairAllocationPool.deleteMany();
  await prisma.mandatoryRule.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.service.deleteMany();

  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Service_id_seq" RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Provider_id_seq" RESTART WITH 1`);

  console.log("Cleared existing data");

  await prisma.service.createMany({
    data: [
      { name: "Plumbing" },
      { name: "Electrical" },
      { name: "Cleaning" },
    ],
  });

  const defaultPassword = await hashPassword("provider123");

  await prisma.provider.createMany({
    data: Array.from({ length: 8 }, (_, i) => ({
      name: `Provider ${i + 1}`,
      email: `provider${i + 1}@prowider.com`,
      password: defaultPassword,
      monthlyQuota: 10,
    })),
  });

  console.log("Created services and providers");

  await prisma.mandatoryRule.createMany({
    data: [
      { serviceId: 1, providerId: 1 },
      { serviceId: 2, providerId: 5 },
      { serviceId: 3, providerId: 1 },
      { serviceId: 3, providerId: 4 },
    ],
  });

  const pools = [
    { serviceId: 1, providerIds: [2, 3, 4] },
    { serviceId: 2, providerIds: [6, 7, 8] },
    { serviceId: 3, providerIds: [2, 3, 5, 6, 7, 8] },
  ];

  for (const { serviceId, providerIds } of pools) {
    await prisma.fairAllocationPool.createMany({
      data: providerIds.map((providerId) => ({ serviceId, providerId, allocationCount: 0 })),
    });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
