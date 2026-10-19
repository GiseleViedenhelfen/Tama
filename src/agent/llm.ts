import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import type { Classification, Intent, Scope } from "./types.js";

export interface LlmClassifier {
  classify(userMessage: string): Promise<Classification>;
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

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.systemPrompt = loadSystemPrompt();
  }

  async classify(userMessage: string): Promise<Classification> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: this.systemPrompt },
        {
          role: "user",
          content: `Classifique a mensagem do cliente:\n"""${userMessage}"""`,
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for the agent");
  }
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  return new OpenAiClassifier(apiKey, model);
}
