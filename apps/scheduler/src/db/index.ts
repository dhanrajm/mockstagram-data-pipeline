import { Pool } from "pg";
import { logger } from "@monorepo/shared-utils";
import { ActiveInfluencer } from "../types";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getActiveInfluencers(): Promise<Map<number, ActiveInfluencer>> {
  try {
    const result = await pool.query<ActiveInfluencer>(
      "SELECT pk, username FROM influencers WHERE is_active = true"
    );

    const activeInfluencers = new Map<number, ActiveInfluencer>();
    for (const row of result.rows) {
      activeInfluencers.set(row.pk, row);
    }

    logger.info(
      { count: activeInfluencers.size },
      "Retrieved active influencers from database"
    );

    return activeInfluencers;
  } catch (error) {
    logger.error({ error }, "Failed to retrieve active influencers");
    throw error;
  }
} 