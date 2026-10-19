export const ORDER_STATUSES = [
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: string;
  status: OrderStatus;
  productId: number | null;
  createdAt: string;
  updatedAt: string;
}

export type ApiResultCode =
  | "ORDER_FOUND"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_CANCELLABLE"
  | "CANCELLATION_SUCCESS"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export interface ApiResult<T = undefined> {
  success: boolean;
  code: ApiResultCode;
  message: string;
  data?: T;
}
