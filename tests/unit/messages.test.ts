import { describe, expect, it } from "vitest";
import {
  confirmCancelPrompt,
  deliveryEtaReply,
  orderStatusReply,
  productComplement,
  statusLabel,
} from "../../src/agent/messages.js";

describe("agent messages", () => {
  it("maps order status to Portuguese labels", () => {
    expect(statusLabel("processing")).toBe("em processamento");
    expect(statusLabel("shipped")).toBe("enviado");
  });

  it("builds user-facing replies from order data", () => {
    expect(orderStatusReply("1001", "processing")).toBe(
      "Pedido 1001 está em processamento.",
    );
    expect(confirmCancelPrompt("1001", "processing")).toContain("1001");
    expect(
      confirmCancelPrompt("1001", "processing", "já foi enviado, cancela"),
    ).toMatch(/em processamento/);
    expect(productComplement("Item", 10)).toContain("R$ 10.00");
    expect(deliveryEtaReply("1001", "shipped")).toMatch(/suporte humano/);
  });
});
