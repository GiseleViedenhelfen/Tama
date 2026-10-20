import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeStoreClient } from "../../src/fakestore/client.js";

describe("FakeStoreClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns product on successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: 1,
            title: "Test",
            price: 9.99,
            description: "d",
            category: "c",
          }),
      }),
    );

    const client = new FakeStoreClient("https://fakestore.test");
    const product = await client.getProduct(1);
    expect(product?.title).toBe("Test");
    expect(fetch).toHaveBeenCalledWith(
      "https://fakestore.test/products/1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns null on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "",
      }),
    );

    const client = new FakeStoreClient("https://fakestore.test/");
    expect(await client.getProduct(99)).toBeNull();
  });

  it("returns null on invalid JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "not-json",
      }),
    );

    const client = new FakeStoreClient("https://fakestore.test");
    expect(await client.getProduct(1)).toBeNull();
  });
});
