import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "tama-api" },
  redact: {
    paths: ["req.headers.authorization", "OPENAI_API_KEY"],
    remove: true,
  },
});

export function logDomainEvent(
  event: string,
  fields: Record<string, unknown>,
): void {
  logger.info({ event, ...fields }, event);
}
