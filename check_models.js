const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

async function check() {
  console.log("Checking models for key:", process.env.GEMINI_API_KEY?.slice(0, 10) + "...");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    // This uses the v1beta API to list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
    );
    const data = await response.json();

    if (data.error) {
      console.error("API Error:", data.error);
      return;
    }

    console.log("\n✅ AVAILABLE MODELS (Copy one of these):");
    const models = data.models || [];

    // Filter for "generateContent" supported models
    const chatModels = models.filter((m) =>
      m.supportedGenerationMethods.includes("generateContent"),
    );

    chatModels.forEach((m) => {
      console.log(`- ${m.name.replace("models/", "")}`);
    });
  } catch (e) {
    console.error("Script failed:", e);
  }
}

check();
