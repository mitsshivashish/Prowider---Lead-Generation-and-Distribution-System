import { config } from "dotenv";
import { resolve } from "path";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ProviderLead"
    ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'assigned',
    ADD COLUMN IF NOT EXISTS "completionNote" TEXT,
    ADD COLUMN IF NOT EXISTS "completionRequestedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ProviderLead_status_idx" ON "ProviderLead"("status");
  `);

  console.log("Provider lead completion migration complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
