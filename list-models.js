const { GoogleGenAI } = require("@google/genai");
const path = require("path");
const dotenv = require("dotenv");

// Load environment from root
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

const apiKey = process.env.GEMINI_API_KEY;
console.log("Using Key:", apiKey ? "Loaded" : "Missing");

async function listModels() {
  if (!apiKey) {
    console.error("No API Key found in .env");
    return;
  }

  const client = new GoogleGenAI({ apiKey });

  try {
    console.log("Fetching models...");
    // The v1 SDK listModels API might differ, trying standard path
    // client.models.list() is typical
    const response = await client.models.list();

    // In SDK v1, list() returns a paginated list or iterable
    // We'll try to iterate or print.

    console.log("--- Available Models ---");
    for await (const model of response) {
      console.log(`- ${model.name} (${model.displayName})`);
    }
  } catch (e) {
    console.error("Error listing models:", e);
    // Fallback inspection if iter fails
    console.log("Error details:", JSON.stringify(e, null, 2));
  }
}

listModels();
