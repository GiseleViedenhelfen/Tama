import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import "dotenv/config";
import { AgentOrchestrator } from "../agent/orchestrator.js";
import { createClassifierFromEnv } from "../agent/llm.js";
import { MainApiClient } from "../agent/main-api-client.js";
import { FakeStoreClient } from "../fakestore/client.js";
import type { SessionState } from "../agent/types.js";

async function main(): Promise<void> {
  const mainApiUrl = process.env.MAIN_API_URL ?? "http://localhost:3000";
  const fakeStoreUrl =
    process.env.FAKESTORE_BASE_URL ?? "https://fakestoreapi.com";

  const orchestrator = new AgentOrchestrator(
    new MainApiClient(mainApiUrl),
    new FakeStoreClient(fakeStoreUrl),
    createClassifierFromEnv(),
  );

  const session: SessionState = { pendingConfirmation: null };
  const rl = readline.createInterface({ input, output });

  console.log("Tama — chat (mock de mensageria). Digite sair para encerrar.\n");

  while (true) {
    const line = await rl.question("Você: ");
    if (/^sair$/i.test(line.trim())) break;

    const { reply, handoff } = await orchestrator.handleTurn(line, session);
    console.log(`Tama: ${reply}`);
    if (handoff) {
      console.log("(handoff humano sugerido)");
    }
    console.log("");
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
