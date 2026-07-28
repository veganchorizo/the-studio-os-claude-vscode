import { request } from "undici";
import { loadConfig } from "../config.js";

/**
 * Minimal Ollama client. Talks only to the local Ollama service inside the
 * Docker network — no external calls are ever made.
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export class OllamaClient {
  private readonly baseUrl: string;

  constructor(baseUrl = loadConfig().OLLAMA_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /** Generate an embedding vector for a single input string. */
  async embed(input: string, model = loadConfig().EMBEDDING_MODEL): Promise<number[]> {
    const res = await request(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt: input }),
    });
    if (res.statusCode >= 400) {
      throw new Error(`Ollama embeddings failed (${res.statusCode})`);
    }
    const json = (await res.body.json()) as { embedding: number[] };
    return json.embedding;
  }

  /**
   * Stream a chat completion, yielding token deltas as they arrive.
   * Uses Ollama's NDJSON streaming protocol.
   */
  async *chatStream(
    messages: ChatMessage[],
    model = loadConfig().LLM_MODEL,
  ): AsyncGenerator<{ token?: string; done: boolean }> {
    const res = await request(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
    });
    if (res.statusCode >= 400) {
      throw new Error(`Ollama chat failed (${res.statusCode})`);
    }
    let buffer = "";
    for await (const chunk of res.body) {
      buffer += chunk.toString();
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const evt = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
        if (evt.message?.content) yield { token: evt.message.content, done: false };
        if (evt.done) {
          yield { done: true };
          return;
        }
      }
    }
    yield { done: true };
  }

  /** Liveness probe used by health checks. */
  async ping(): Promise<boolean> {
    try {
      const res = await request(`${this.baseUrl}/api/tags`, { method: "GET" });
      return res.statusCode < 400;
    } catch {
      return false;
    }
  }
}

export const ollama = new OllamaClient();
