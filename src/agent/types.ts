export type Scope = "in_scope" | "out_of_scope" | "unsafe";

export type Intent =
  | "order_status"
  | "cancel_request"
  | "product_info"
  | "greeting"
  | "confirm_yes"
  | "confirm_no"
  | "human_handoff"
  | "unknown";

export interface Classification {
  scope: Scope;
  intent: Intent;
  orderId: string | null;
  productQuery: string | null;
}

export interface PendingConfirmation {
  orderId: string;
  action: "cancel";
}

export interface SessionState {
  pendingConfirmation: PendingConfirmation | null;
  /** Last order id successfully used in this CLI session */
  lastOrderId: string | null;
}

export interface AgentTurnResult {
  reply: string;
  handoff: boolean;
}
