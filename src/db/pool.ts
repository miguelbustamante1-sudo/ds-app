import { Pool } from 'pg';
import { prisma } from './prisma';

// Shared Postgres pool used across the app (legacy - being migrated to Prisma)
export const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});

// Export Prisma client for new code
export { prisma };

export default pool;
