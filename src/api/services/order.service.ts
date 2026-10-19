import * as repo from "../../db/order.repository.js";
import type { ApiResult, Order } from "../../shared/order.types.js";

export async function getOrder(orderId: string): Promise<ApiResult<Order>> {
  const trimmed = orderId.trim();
  if (!trimmed) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: "Order id is required",
    };
  }

  try {
    const order = await repo.findOrderById(trimmed);
    if (!order) {
      return {
        success: false,
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      };
    }
    return {
      success: true,
      code: "ORDER_FOUND",
      message: "Order found",
      data: order,
    };
  } catch {
    return {
      success: false,
      code: "INTERNAL_ERROR",
      message: "Failed to retrieve order",
    };
  }
}

export async function cancelOrder(orderId: string): Promise<ApiResult<Order>> {
  const trimmed = orderId.trim();
  if (!trimmed) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: "Order id is required",
    };
  }

  try {
    const existing = await repo.findOrderById(trimmed);
    if (!existing) {
      return {
        success: false,
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      };
    }

    if (existing.status === "cancelled") {
      return {
        success: true,
        code: "CANCELLATION_SUCCESS",
        message: "Order is already cancelled",
        data: existing,
      };
    }

    if (existing.status !== "processing") {
      return {
        success: false,
        code: "ORDER_NOT_CANCELLABLE",
        message: "Order cannot be cancelled in its current status",
        data: existing,
      };
    }

    const updated = await repo.updateOrderStatus(trimmed, "cancelled");
    if (!updated) {
      return {
        success: false,
        code: "INTERNAL_ERROR",
        message: "Failed to cancel order",
      };
    }

    return {
      success: true,
      code: "CANCELLATION_SUCCESS",
      message: "Order cancelled successfully",
      data: updated,
    };
  } catch {
    return {
      success: false,
      code: "INTERNAL_ERROR",
      message: "Failed to cancel order",
    };
  }
}
