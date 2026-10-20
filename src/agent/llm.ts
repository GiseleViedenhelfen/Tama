import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import type { Classification, Intent, Scope } from "./types.js";

export interface LlmClassifier {
  classify(
    userMessage: string,
    sessionHint?: { lastOrderId?: string | null },
  ): Promise<Classification>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSystemPrompt(): string {
  return readFileSync(join(__dirname, "prompts/system.md"), "utf8");
}

const classificationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    scope: {
      type: "string",
      enum: ["in_scope", "out_of_scope", "unsafe"],
    },
    intent: {
      type: "string",
      enum: [
        "order_status",
        "cancel_request",
        "product_info",
        "greeting",
        "confirm_yes",
        "confirm_no",
        "human_handoff",
        "unknown",
      ],
    },
    orderId: { type: ["string", "null"] },
    productQuery: { type: ["string", "null"] },
  },
  required: ["scope", "intent", "orderId", "productQuery"],
} as const;

export class OpenAiClassifier implements LlmClassifier {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly systemPrompt: string;

  constructor(apiKey: string, model: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseURL || undefined,
    });
    this.model = model;
    this.systemPrompt = loadSystemPrompt();
  }

  async classify(
    userMessage: string,
    sessionHint?: { lastOrderId?: string | null },
  ): Promise<Classification> {
    const contextLine = sessionHint?.lastOrderId
      ? `Contexto da conversa: o pedido ${sessionHint.lastOrderId} já foi mencionado nesta sessão.\n`
      : "";

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: this.systemPrompt },
          {
            role: "user",
            content: `${contextLine}Classifique a mensagem do cliente:\n"""${userMessage}"""`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "agent_classification",
            strict: true,
            schema: classificationSchema,
          },
        },
      });
    } catch (err) {
      const hint =
        process.env.OPENAI_API_KEY?.startsWith("gsk_") &&
        !process.env.OPENAI_BASE_URL?.trim()
          ? " Groq keys need OPENAI_BASE_URL=https://api.groq.com/openai/v1 in .env."
          : "";
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`LLM classification failed:${hint} ${message}`);
    }

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return {
        scope: "in_scope",
        intent: "unknown",
        orderId: null,
        productQuery: null,
      };
    }

    const parsed = JSON.parse(raw) as Classification;
    return {
      scope: parsed.scope as Scope,
      intent: parsed.intent as Intent,
      orderId: parsed.orderId,
      productQuery: parsed.productQuery,
    };
  }
}

export function createClassifierFromEnv(): LlmClassifier {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for the agent");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  return new OpenAiClassifier(apiKey, model, baseURL);
}
