import { Pool } from "pg";

const PG_CONFIG = {
  host: process.env.PGHOST || "timescaledb",
  port: parseInt(process.env.PGPORT || "5432", 10),
  user: process.env.PGUSER || "mockstagram",
  password: process.env.PGPASSWORD || "mockstagram",
  database: process.env.PGDATABASE || "mockstagram",
};

export async function initializeDatabase(): Promise<Pool> {
  return new Pool(PG_CONFIG);
} 