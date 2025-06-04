import axios from "axios";
import { FetcherResult } from "../types";
import { logger } from "@monorepo/shared-utils";
import { logMetric } from "../metrics/logger";
import { Metrics } from "../metrics";

const baseUrl =
  process.env.MOCKSTAGRAM_API_BASE_URL || "http://localhost:3500/api/v1";
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || "3", 10);
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY || "1000", 10);

export async function fetchInfluencerData(
  pk: number,
  metrics: Metrics | undefined,
  retries = 0
): Promise<FetcherResult> {
  const startTime = Date.now();
  logger.info({ pk, startTime }, "Fetching influencer data started");
  logMetric(metrics, {
    type: "increment",
    metric: "apiCallsCounter",
  });

  try {
    const response = await axios.get(`${baseUrl}/influencers/${pk}`);
    const duration = (Date.now() - startTime) / 1000;
    logger.info({ pk, duration }, "Fetched influencer data successfully");
    logMetric(metrics, {
      type: "observe",
      metric: "apiCallDurationHistogram",
      value: duration,
    });

    return {
      pk,
      username: response.data.username,
      followerCount: response.data.followerCount,
      fetchTimestamp: new Date().toISOString(),
      targetMinuteTimestamp: response.data.targetMinuteTimestamp,
    };
  } catch (error) {
    logger.error({ error, pk, retries }, "API call failed");
    if (retries < MAX_RETRIES) {
      logger.warn({ error, pk, retries }, "API call failed, retrying...");
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY * (retries + 1))
      );
      return fetchInfluencerData(pk, metrics, retries + 1);
    }
    throw error;
  }
}
