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
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "email" TEXT;
    ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "password" TEXT;
  `);

  const providers = await prisma.provider.findMany({ orderBy: { id: "asc" } });
  const hashed = hashPassword("provider123");

  for (const provider of providers) {
    if (!provider.email) {
      await prisma.provider.update({
        where: { id: provider.id },
        data: {
          email: `provider${provider.id}@prowider.com`,
          password: hashed,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Provider" ALTER COLUMN "email" SET NOT NULL;
    ALTER TABLE "Provider" ALTER COLUMN "password" SET NOT NULL;
  `);

  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Provider_email_key" ON "Provider"("email");
    `);
  } catch {
    // index may already exist
  }

  console.log("Provider auth migration complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
