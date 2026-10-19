import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header("x-request-id");
  const id = incoming && incoming.length > 0 ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
