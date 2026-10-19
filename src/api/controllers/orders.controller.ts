import type { Request, Response } from "express";
import * as orderService from "../services/order.service.js";
import { logDomainEvent } from "../logger.js";

function httpStatusForCode(
  code: string,
  success: boolean,
): number {
  if (code === "ORDER_NOT_FOUND") return 404;
  if (code === "ORDER_NOT_CANCELLABLE") return 409;
  if (code === "VALIDATION_ERROR") return 422;
  if (code === "INTERNAL_ERROR") return 500;
  return success ? 200 : 500;
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const orderId = req.params.orderId;
  logDomainEvent("order.lookup.request", {
    requestId: req.requestId,
    orderId,
  });

  const result = await orderService.getOrder(orderId);
  logDomainEvent("order.lookup.result", {
    requestId: req.requestId,
    orderId,
    code: result.code,
    success: result.success,
  });

  res.status(httpStatusForCode(result.code, result.success)).json(result);
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const orderId = req.params.orderId;
  logDomainEvent("order.cancellation.request", {
    requestId: req.requestId,
    orderId,
  });

  const result = await orderService.cancelOrder(orderId);
  logDomainEvent("order.cancellation.result", {
    requestId: req.requestId,
    orderId,
    code: result.code,
    success: result.success,
  });

  res.status(httpStatusForCode(result.code, result.success)).json(result);
}
