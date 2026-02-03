// packages/shared/src/services/GeminiProvider.ts
import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { AgentStatus } from "../index";

export class GeminiProvider {
  private client: any;

  constructor(apiKey: string) {
    if (!apiKey) {
      // ⚠️ CRITICAL: The API might be receiving "undefined" as a string
      throw new Error("GeminiProvider: API Key is missing or undefined.");
    }
    // New unified client initialization
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateWithReasoning(
    prompt: string,
    incidentId: string,
    agentName: string,
  ): Promise<string> {
    try {
      // Primary: Gemini 3.0 Flash Preview (User Requested)
      const primaryModel = "gemini-3-flash-preview";

      console.log(`[GeminiProvider] Attempting primary model: ${primaryModel}`);

      try {
        const result = await this.client.models.generateContent({
          model: primaryModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            thinkingConfig: {
              includeThoughts: true,
            },
          },
        });
        return await this.processResult(result, incidentId, agentName);
      } catch (err: any) {
        // Fallback: Gemini 1.5 Flash-002 (Stable)
        console.warn(
          `[GeminiProvider] Primary model failed (${err.message}). Switching to fallback.`,
        );

        const fallbackModel = "gemini-2.5-flash";
        console.log(`[GeminiProvider] Attempting fallback model: ${fallbackModel}`);

        const result = await this.client.models.generateContent({
          model: fallbackModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          // Note: 1.5 Flash does not support 'thinkingConfig', so we omit it
        });
        return await this.processResult(result, incidentId, agentName);
      }
    } catch (error: any) {
      console.error("[RCA] Failed:", error);

      await db.agentRun.create({
        data: {
          incidentId,
          agentName,
          status: AgentStatus.FAILED,
          thoughts: `Error: ${error.message}`,
          output: { error: error.message, stack: error.stack },
        },
      });

      throw error;
    }
  }

  private async processResult(result: any, incidentId: string, agentName: string) {
    // 💡 Access text and reasoning directly from the result
    const finalResponse = result.text;
    const rawThoughts = result.reasoning; // Might be undefined on fallback

    // Persist to DB
    await db.agentRun.create({
      data: {
        incidentId: incidentId,
        agentName: agentName,
        status: AgentStatus.COMPLETED,
        thoughts: rawThoughts || "No reasoning trace (Fallback Model used).",
        output: { text: finalResponse || "No text generated" },
      },
    });

    return finalResponse || "";
  }

  // Simple generate without DB logging (for Patch Agent)
  async generate(prompt: string): Promise<string> {
    try {
      const model = "gemini-2.5-flash"; // Use stable model for code gen
      console.log(`[GeminiProvider] Generating content with: ${model}`);

      const result = await this.client.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      return result.text || "";
    } catch (error: any) {
      console.error("[GeminiProvider] Generate failed:", error);
      throw error;
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.client.models.embedContent({
        model: "text-embedding-004",
        contents: [
          {
            parts: [
              {
                text: text,
              },
            ],
          },
        ],
      });
      if (result.embeddings && result.embeddings.length > 0) {
        return result.embeddings[0].values;
      }
      throw new Error("No embeddings returned from Gemini API");
    } catch (error) {
      console.error("[GeminiProvider] Embedding failed:", error);
      throw error;
    }
  }
}
