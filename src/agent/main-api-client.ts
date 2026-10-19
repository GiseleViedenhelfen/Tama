import type { ApiResult, Order } from "../shared/order.types.js";

export class MainApiClient {
  constructor(private readonly baseUrl: string) {}

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}${path}`;
  }

  async getOrder(orderId: string): Promise<ApiResult<Order>> {
    const res = await fetch(this.url(`/orders/${encodeURIComponent(orderId)}`), {
      signal: AbortSignal.timeout(8000),
    });
    return (await res.json()) as ApiResult<Order>;
  }

  async cancelOrder(orderId: string): Promise<ApiResult<Order>> {
    const res = await fetch(
      this.url(`/orders/${encodeURIComponent(orderId)}/cancellation`),
      { method: "POST", signal: AbortSignal.timeout(8000) },
    );
    return (await res.json()) as ApiResult<Order>;
  }
}
