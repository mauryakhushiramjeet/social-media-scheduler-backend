import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Create PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Use PrismaPg driver adapter for Prisma 7
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
