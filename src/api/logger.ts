import pino from "pino";

const logLevel = process.env.LOG_LEVEL?.trim() || "info";

/** stderr — keeps JSON logs out of the CLI chat line on stdout */
export const logger = pino(
  {
    level: logLevel,
    base: { service: "tama-api" },
    redact: {
      paths: ["req.headers.authorization", "OPENAI_API_KEY"],
      remove: true,
    },
  },
  pino.destination(2),
);

export function logDomainEvent(
  event: string,
  fields: Record<string, unknown>,
  level: "info" | "debug" = "info",
): void {
  logger[level]({ event, ...fields }, event);
}
