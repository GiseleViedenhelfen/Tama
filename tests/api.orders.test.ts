import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/api/app.js";
import * as orderService from "../src/api/services/order.service.js";

vi.mock("../src/api/services/order.service.js");

describe("orders API", () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET /orders/:id returns 200 when found", async () => {
    vi.mocked(orderService.getOrder).mockResolvedValue({
      success: true,
      code: "ORDER_FOUND",
      message: "ok",
      data: {
        id: "1001",
        status: "processing",
        productId: 1,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    });

    const res = await request(app).get("/orders/1001");
    expect(res.status).toBe(200);
    expect(res.body.code).toBe("ORDER_FOUND");
  });

  it("POST cancellation returns 409 when not cancellable", async () => {
    vi.mocked(orderService.cancelOrder).mockResolvedValue({
      success: false,
      code: "ORDER_NOT_CANCELLABLE",
      message: "blocked",
      data: {
        id: "1002",
        status: "shipped",
        productId: 2,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    });

    const res = await request(app).post("/orders/1002/cancellation");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ORDER_NOT_CANCELLABLE");
  });
});
