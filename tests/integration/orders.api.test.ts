import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app.js";
import { integrationTestsEnabled } from "../helpers/database-url.js";
import { resetOrderSeeds, shutdownDatabase } from "./setup.js";

const describeIntegration = integrationTestsEnabled() ? describe : describe.skip;

describeIntegration("orders API (integration)", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetOrderSeeds();
  });

  afterAll(async () => {
    await shutdownDatabase();
  });

  it("GET /orders/:id returns seeded processing order", async () => {
    const res = await request(app).get("/orders/1001");
    expect(res.status).toBe(200);
    expect(res.body.code).toBe("ORDER_FOUND");
    expect(res.body.data.status).toBe("processing");
    expect(res.body.data.productId).toBe(1);
  });

  it("GET /orders/:id returns 404 for unknown id", async () => {
    const res = await request(app).get("/orders/9999");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("ORDER_NOT_FOUND");
  });

  it("POST cancellation succeeds for processing order", async () => {
    const res = await request(app).post("/orders/1001/cancellation");
    expect(res.status).toBe(200);
    expect(res.body.code).toBe("CANCELLATION_SUCCESS");
    expect(res.body.data.status).toBe("cancelled");
  });

  it("POST cancellation returns 409 for shipped order", async () => {
    const res = await request(app).post("/orders/1002/cancellation");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ORDER_NOT_CANCELLABLE");
  });

  it("POST cancellation is idempotent for already cancelled order", async () => {
    const res = await request(app).post("/orders/1004/cancellation");
    expect(res.status).toBe(200);
    expect(res.body.code).toBe("CANCELLATION_SUCCESS");
    expect(res.body.data.status).toBe("cancelled");
  });
});
