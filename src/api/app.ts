import express, { type Request, type Response, type NextFunction } from "express";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { ordersRouter } from "./routes/orders.routes.js";
import { swaggerSpec } from "./openapi.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { logger } from "./logger.js";

export function createApp(): express.Application {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps: (req: Request) => ({
        requestId: req.requestId,
      }),
    }),
  );
  app.use(express.json({ limit: "4kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/orders", ordersRouter);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      logger.error({ err, event: "api.unhandled_error" }, "Unhandled error");
      res.status(500).json({
        success: false,
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      });
    },
  );

  return app;
}
