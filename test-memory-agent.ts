import dotenv from "dotenv";
import path from "path";
// Load .env relative to this script (project root)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { GeminiProvider } from "./packages/shared";
import { MemoryAgent } from "./apps/api/src/agents/memory";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API KEY found!");
    process.exit(1);
  }

  const gemini = new GeminiProvider(apiKey);
  const memoryAgent = new MemoryAgent(gemini);

  console.log("--- Testing Memory Agent ---");

  // 1. Store a memory
  const testContent =
    "The fix for EADDRINUSE error is to kill the process using the port with taskkill /PID <pid> /F.";
  await memoryAgent.storeMemory(testContent, "POSITIVE", ["error-handling", "windows"]);

  // 2. Search for it
  const query = "how to fix address in use error";
  const results = await memoryAgent.findSimilar(query);

  console.log("\n--- Search Results ---");
  results.forEach((res, i) => {
    console.log(`${i + 1}. [${res.type}] ${res.content} (Tags: ${res.tags})`);
  });
}

main();
