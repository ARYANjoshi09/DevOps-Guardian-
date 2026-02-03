import { db, GeminiProvider } from "@devops-guardian/shared";

export class MemoryAgent {
  private gemini: GeminiProvider;

  constructor(gemini: GeminiProvider) {
    this.gemini = gemini;
  }

  /**
   * Stores a new memory (learning) with a vector embedding.
   */
  async storeMemory(content: string, type: "POSITIVE" | "NEGATIVE", tags: string[] = []) {
    try {
      console.log(`[Memory] Storing ${type} memory...`);
      const embedding = await this.gemini.getEmbedding(content);

      // pgvector requires the vector to be formatted as a string representation of an array
      const vectorString = `[${embedding.join(",")}]`;

      // Using executeRaw because 'embedding' is Unsupported("vector") in Prisma schema
      await db.$executeRaw`
        INSERT INTO "Memory" (id, content, type, tags, embedding, "createdAt")
        VALUES (gen_random_uuid(), ${content}, ${type}, ${tags}, ${vectorString}::vector, NOW())
      `;
      console.log(`[Memory] Stored successfully.`);
    } catch (error) {
      console.error("[Memory] Failed to store memory:", error);
      throw error;
    }
  }

  /**
   * Finds similar past memories using cosine similarity.
   */
  async findSimilar(query: string, limit: number = 3): Promise<any[]> {
    try {
      console.log(`[Memory] Searching for: "${query.substring(0, 50)}..."`);
      const embedding = await this.gemini.getEmbedding(query);
      const vectorString = `[${embedding.join(",")}]`;

      // Cosine distance operator is <=> in pgvector.
      // We order by distance ASC (closest first).
      const results: any[] = await db.$queryRaw`
        SELECT id, content, type, tags
        FROM "Memory"
        ORDER BY embedding <=> ${vectorString}::vector
        LIMIT ${limit};
      `;

      return results;
    } catch (error) {
      console.error("[Memory] Search failed:", error);
      return [];
    }
  }
}
