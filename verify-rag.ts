import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { GeminiProvider } from "./packages/shared/src/services/GeminiProvider";
import { MemoryAgent } from "./apps/api/src/agents/memory";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API KEY");
    process.exit(1);
  }

  const gemini = new GeminiProvider(apiKey);
  const memoryAgent = new MemoryAgent(gemini);

  console.log("--- Testing RAG Retrieval ---");

  // Search for the failure we just stored
  const query = "verification timeout connection error";
  console.log(`Query: "${query}"`);

  const results = await memoryAgent.findSimilar(query);

  console.log("\n--- Results ---");
  if (results.length === 0) {
    console.log("No memories found.");
  } else {
    results.forEach((res, i) => {
      console.log(`${i + 1}. [${res.type}] ${res.content}`);
      console.log(`   Tags: ${res.tags}`);
    });
  }
}

main();
