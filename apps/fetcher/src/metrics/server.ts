import express, { Request, Response } from "express";
import { logger } from "@monorepo/shared-utils";
import { Metrics } from "./index";

export async function startMetricsServer(
  port: number,
  metrics: Metrics
): Promise<void> {
  // Only start metrics server if enabled
  if (process.env.ENABLE_METRICS !== "true") {
    logger.info("Metrics server is disabled");
    return;
  }

  const app = express();

  app.get("/metrics", async (_req: Request, res: Response) => {
    res.set("Content-Type", "text/plain");
    res.end(await metrics.metrics());
  });

  return new Promise((resolve) => {
    app.listen(port, () => {
      logger.info(`Metrics server listening on port ${port}`);
      resolve();
    });
  });
}
