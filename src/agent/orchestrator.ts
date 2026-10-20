import type { FakeStoreClient } from "../fakestore/client.js";
import type { OrderStatus } from "../shared/order.types.js";
import type { MainApiClient } from "./main-api-client.js";
import type { LlmClassifier } from "./llm.js";
import {
  ASK_ORDER_ID,
  REFUSAL_OUT_OF_SCOPE,
  REFUSAL_UNSAFE,
  HUMAN_HANDOFF,
  apiFailureReply,
  cancelDeclinedReply,
  cancelSuccessReply,
  confirmCancelPrompt,
  contextReminderReply,
  deliveryEtaReply,
  greetingReply,
  notCancellableReply,
  orderNotFoundReply,
  orderStatusReply,
  productComplement,
  productUnavailableNote,
} from "./messages.js";
import type { AgentTurnResult, SessionState } from "./types.js";

const YES = /^(sim|s|yes|y|confirmo|confirmar)$/i;
const NO = /^(não|nao|n|no)$/i;
const ORDER_ID = /\b(\d{3,})\b/;
const DELIVERY_QUESTION =
  /chega quando|quando chega|prazo de entrega|data de entrega|vai chegar|previs[aã]o|demora quanto/i;
const CONTEXT_FRUSTRATION =
  /j[aá] (te )?(falei|disse)|eu disse|mesmo pedido|j[aá] informei/i;

function extractOrderId(text: string, fromLlm: string | null): string | null {
  if (fromLlm?.trim()) return fromLlm.trim();
  const match = text.match(ORDER_ID);
  return match ? match[1] : null;
}

function resolveOrderId(
  text: string,
  fromLlm: string | null,
  session: SessionState,
): string | null {
  return extractOrderId(text, fromLlm) ?? session.lastOrderId;
}

function rememberOrder(session: SessionState, orderId: string): void {
  session.lastOrderId = orderId;
}

function isYes(text: string): boolean {
  return YES.test(text.trim());
}

function isNo(text: string): boolean {
  return NO.test(text.trim());
}

export class AgentOrchestrator {
  constructor(
    private readonly api: MainApiClient,
    private readonly fakeStore: FakeStoreClient,
    private readonly classifier: LlmClassifier,
  ) {}

  async handleTurn(
    message: string,
    session: SessionState,
  ): Promise<AgentTurnResult> {
    const trimmed = message.trim();
    if (!trimmed) {
      return { reply: ASK_ORDER_ID, handoff: false };
    }

    if (session.pendingConfirmation) {
      return this.handlePendingConfirmation(trimmed, session);
    }

    if (DELIVERY_QUESTION.test(trimmed) && session.lastOrderId) {
      return this.handleDeliveryQuestion(session.lastOrderId);
    }

    if (CONTEXT_FRUSTRATION.test(trimmed) && session.lastOrderId) {
      return {
        reply: contextReminderReply(session.lastOrderId),
        handoff: false,
      };
    }

    const classification = await this.classifier.classify(trimmed, {
      lastOrderId: session.lastOrderId,
    });

    if (classification.scope === "unsafe") {
      return { reply: REFUSAL_UNSAFE, handoff: true };
    }
    if (classification.scope === "out_of_scope") {
      return { reply: REFUSAL_OUT_OF_SCOPE, handoff: false };
    }

    const orderId = resolveOrderId(trimmed, classification.orderId, session);

    switch (classification.intent) {
      case "human_handoff":
        return { reply: HUMAN_HANDOFF, handoff: true };
      case "greeting":
        return { reply: greetingReply(), handoff: false };
      case "confirm_yes":
      case "confirm_no":
        return {
          reply: session.lastOrderId
            ? contextReminderReply(session.lastOrderId)
            : "Não há cancelamento pendente. Qual é o número do pedido?",
          handoff: false,
        };
      case "order_status":
        if (DELIVERY_QUESTION.test(trimmed) && orderId) {
          return this.handleDeliveryQuestion(orderId);
        }
        return this.handleOrderStatus(orderId, session);
      case "cancel_request":
        return this.handleCancelRequest(orderId, session);
      case "product_info":
        return this.handleProductInfo(orderId, session);
      default:
        if (orderId) {
          return this.handleOrderStatus(orderId, session);
        }
        return {
          reply:
            "Posso ajudar com status ou cancelamento de pedido. Qual é o número do pedido?",
          handoff: false,
        };
    }
  }

  private async handlePendingConfirmation(
    message: string,
    session: SessionState,
  ): Promise<AgentTurnResult> {
    const pending = session.pendingConfirmation!;
    if (isYes(message)) {
      session.pendingConfirmation = null;
      try {
        const result = await this.api.cancelOrder(pending.orderId);
        if (result.success && result.code === "CANCELLATION_SUCCESS") {
          rememberOrder(session, pending.orderId);
          return {
            reply: cancelSuccessReply(pending.orderId),
            handoff: false,
          };
        }
        if (result.code === "ORDER_NOT_CANCELLABLE" && result.data) {
          return {
            reply: notCancellableReply(
              pending.orderId,
              result.data.status as OrderStatus,
            ),
            handoff: true,
          };
        }
        if (result.code === "ORDER_NOT_FOUND") {
          return {
            reply: orderNotFoundReply(pending.orderId),
            handoff: false,
          };
        }
        return { reply: apiFailureReply(), handoff: true };
      } catch {
        return { reply: apiFailureReply(), handoff: true };
      }
    }

    if (isNo(message)) {
      session.pendingConfirmation = null;
      rememberOrder(session, pending.orderId);
      return {
        reply: cancelDeclinedReply(pending.orderId),
        handoff: false,
      };
    }

    return {
      reply: confirmCancelPrompt(pending.orderId),
      handoff: false,
    };
  }

  private async handleDeliveryQuestion(
    orderId: string,
  ): Promise<AgentTurnResult> {
    try {
      const result = await this.api.getOrder(orderId);
      if (result.success && result.data) {
        return {
          reply: deliveryEtaReply(orderId, result.data.status),
          handoff: true,
        };
      }
      if (result.code === "ORDER_NOT_FOUND") {
        return { reply: orderNotFoundReply(orderId), handoff: false };
      }
      return { reply: apiFailureReply(), handoff: true };
    } catch {
      return { reply: apiFailureReply(), handoff: true };
    }
  }

  private async handleOrderStatus(
    orderId: string | null,
    session: SessionState,
  ): Promise<AgentTurnResult> {
    if (!orderId) {
      return { reply: ASK_ORDER_ID, handoff: false };
    }
    try {
      const result = await this.api.getOrder(orderId);
      if (result.success && result.data) {
        rememberOrder(session, orderId);
        return {
          reply: orderStatusReply(orderId, result.data.status),
          handoff: false,
        };
      }
      if (result.code === "ORDER_NOT_FOUND") {
        return { reply: orderNotFoundReply(orderId), handoff: false };
      }
      return { reply: apiFailureReply(), handoff: true };
    } catch {
      return { reply: apiFailureReply(), handoff: true };
    }
  }

  private async handleCancelRequest(
    orderId: string | null,
    session: SessionState,
  ): Promise<AgentTurnResult> {
    if (!orderId) {
      return { reply: ASK_ORDER_ID, handoff: false };
    }
    try {
      const result = await this.api.getOrder(orderId);
      if (!result.success || !result.data) {
        if (result.code === "ORDER_NOT_FOUND") {
          return { reply: orderNotFoundReply(orderId), handoff: false };
        }
        return { reply: apiFailureReply(), handoff: true };
      }

      rememberOrder(session, orderId);

      if (result.data.status !== "processing") {
        return {
          reply: notCancellableReply(orderId, result.data.status),
          handoff: true,
        };
      }

      session.pendingConfirmation = { orderId, action: "cancel" };
      return { reply: confirmCancelPrompt(orderId), handoff: false };
    } catch {
      return { reply: apiFailureReply(), handoff: true };
    }
  }

  private async handleProductInfo(
    orderId: string | null,
    session: SessionState,
  ): Promise<AgentTurnResult> {
    if (!orderId) {
      return { reply: ASK_ORDER_ID, handoff: false };
    }
    try {
      const result = await this.api.getOrder(orderId);
      if (!result.success || !result.data) {
        if (result.code === "ORDER_NOT_FOUND") {
          return { reply: orderNotFoundReply(orderId), handoff: false };
        }
        return { reply: apiFailureReply(), handoff: true };
      }

      rememberOrder(session, orderId);

      let reply = orderStatusReply(orderId, result.data.status);
      const productId = result.data.productId;
      if (productId != null) {
        const product = await this.fakeStore.getProduct(productId);
        if (product) {
          reply += ` ${productComplement(product.title, product.price)}`;
        } else {
          reply += ` ${productUnavailableNote()}`;
        }
      }
      return { reply, handoff: false };
    } catch {
      return { reply: apiFailureReply(), handoff: true };
    }
  }
}
