import type { OrderStatus } from "../shared/order.types.js";

const STATUS_PT: Record<OrderStatus, string> = {
  processing: "em processamento",
  shipped: "enviado",
  delivered: "entregue",
  cancelled: "cancelado",
};

export function statusLabel(status: OrderStatus): string {
  return STATUS_PT[status];
}

export const REFUSAL_OUT_OF_SCOPE =
  "Não consigo ajudar com isso daqui — sou a Tama, assistente de pedidos da loja. Posso consultar status ou orientar cancelamento, quando as regras permitirem. Quer falar de algum pedido?";

export const REFUSAL_UNSAFE =
  "Por segurança, não posso seguir essa instrução. Posso ajudar com seu pedido ou encaminhar você para um atendente humano.";

export const HUMAN_HANDOFF =
  "Para continuar com segurança, fale com o suporte humano da loja. Posso ajudar com consulta de status ou cancelamento quando o pedido estiver em processamento.";

export const ASK_ORDER_ID =
  "Qual é o número do pedido? Assim consigo consultar ou seguir com cancelamento.";

export function confirmCancelPrompt(orderId: string): string {
  return `Confirma o cancelamento do pedido ${orderId}? Responda sim ou não.`;
}

export function orderStatusReply(orderId: string, status: OrderStatus): string {
  return `Pedido ${orderId} está ${statusLabel(status)}.`;
}

export function cancelSuccessReply(orderId: string): string {
  return `Pronto: o pedido ${orderId} foi cancelado com sucesso.`;
}

export function cancelDeclinedReply(orderId: string): string {
  return `Ok, o pedido ${orderId} não foi cancelado.`;
}

export function notCancellableReply(orderId: string, status: OrderStatus): string {
  return `Não consigo cancelar o pedido ${orderId} pelo chat — ele está ${statusLabel(status)}. ${HUMAN_HANDOFF}`;
}

export function orderNotFoundReply(orderId: string): string {
  return `Não encontrei o pedido ${orderId}. Confira o número e tente de novo.`;
}

export function apiFailureReply(): string {
  return `Não consegui confirmar essa ação agora. Tente novamente em instantes ou fale com o suporte humano.`;
}

export function greetingReply(): string {
  return "Olá! Sou a Tama. Posso consultar status de pedido ou orientar cancelamento se ainda estiver em processamento. Me informe o número do pedido.";
}

export function productComplement(title: string, price: number): string {
  return `Sobre o item: ${title}. Referência de catálogo: R$ ${price.toFixed(2)}.`;
}

export function productUnavailableNote(): string {
  return "No momento não consegui carregar os detalhes do produto no catálogo.";
}

export function deliveryEtaReply(orderId: string, status: OrderStatus): string {
  return `No pedido ${orderId} eu só tenho o status oficial: ${statusLabel(status)}. Não tenho previsão de entrega aqui — para prazo de chegada, fale com o suporte humano da loja.`;
}

export function contextReminderReply(orderId: string): string {
  return `Certo, continuamos no pedido ${orderId}. Posso informar status, falar do item ou orientar cancelamento se ainda estiver em processamento.`;
}
