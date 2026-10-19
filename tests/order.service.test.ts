import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "../src/db/order.repository.js";
import * as orderService from "../src/api/services/order.service.js";

vi.mock("../src/db/order.repository.js");

describe("orderService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns not found for missing order", async () => {
    vi.mocked(repo.findOrderById).mockResolvedValue(null);
    const result = await orderService.getOrder("9999");
    expect(result.code).toBe("ORDER_NOT_FOUND");
    expect(result.success).toBe(false);
  });

  it("cancels processing order", async () => {
    vi.mocked(repo.findOrderById).mockResolvedValue({
      id: "1001",
      status: "processing",
      productId: 1,
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(repo.updateOrderStatus).mockResolvedValue({
      id: "1001",
      status: "cancelled",
      productId: 1,
      createdAt: "",
      updatedAt: "",
    });

    const result = await orderService.cancelOrder("1001");
    expect(result.success).toBe(true);
    expect(result.code).toBe("CANCELLATION_SUCCESS");
  });

  it("rejects cancellation for shipped order", async () => {
    vi.mocked(repo.findOrderById).mockResolvedValue({
      id: "1002",
      status: "shipped",
      productId: 2,
      createdAt: "",
      updatedAt: "",
    });

    const result = await orderService.cancelOrder("1002");
    expect(result.success).toBe(false);
    expect(result.code).toBe("ORDER_NOT_CANCELLABLE");
  });
});
