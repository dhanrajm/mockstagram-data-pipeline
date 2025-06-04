import express, { Request, Response } from "express";
import { logger } from "@monorepo/shared-utils";
import { Metrics } from "./metrics";

export async function startServer(port: number, metrics: Metrics): Promise<void> {
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