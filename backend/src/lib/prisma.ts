import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Lazy singleton — created on first access, after env is loaded
let _prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const pool = new Pool({
      connectionString: url,
      max: 3, // Prevent exceeding Render's free tier connection limit
      connectionTimeoutMillis: 30000, // Wait up to 30s for an available connection
    });
    const adapter = new PrismaPg(pool);
    _prisma = new PrismaClient({ adapter, log: ["error"] });
  }
  return _prisma;
}

// Proxy so existing code using `prisma.xxx` still works
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  },
});

export default prisma;
