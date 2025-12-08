import { PrismaClient } from "@prisma/client";
console.log("✅ Connected DB:", process.env.DATABASE_URL);

let prisma: PrismaClient;

declare global {
  // Allow global `var` in dev to avoid multiple instances
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

if (!global.prisma) {
  const url = process.env.DATABASE_URL || "";
  // Mask sensitive parts
  const masked = url.replace(/:(\/\/[^:]+):([^@]+)@/, "://$1:****@");
  console.log("[Prisma] Using DATABASE_URL:", masked);
  global.prisma = new PrismaClient();
}

prisma = global.prisma;
export default prisma;
