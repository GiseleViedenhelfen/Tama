import { logDomainEvent } from "../api/logger.js";

export interface FakeStoreProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
}

export class FakeStoreClient {
  constructor(private readonly baseUrl: string) {}

  async getProduct(id: number): Promise<FakeStoreProduct | null> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/products/${id}`;
    const started = Date.now();
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });
      const durationMs = Date.now() - started;
      logDomainEvent("external.fakestore.fetch", {
        productId: id,
        httpStatus: res.status,
        durationMs,
        ok: res.ok,
      });

      if (!res.ok) return null;
      const text = await res.text();
      if (!text.trim()) return null;

      const data = JSON.parse(text) as FakeStoreProduct;
      if (typeof data.id !== "number") return null;
      return data;
    } catch (err) {
      logDomainEvent("external.fakestore.error", {
        productId: id,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : "unknown",
      });
      return null;
    }
  }
}
