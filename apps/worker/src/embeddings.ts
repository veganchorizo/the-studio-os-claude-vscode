import { request } from "undici";

const BASE = (process.env.OLLAMA_BASE_URL ?? "http://studio-os-ollama:11434").replace(/\/$/, "");
const MODEL = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";

/** Embed one string via the local Ollama service. */
export async function embed(input: string): Promise<number[]> {
  const res = await request(`${BASE}/api/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: input }),
  });
  if (res.statusCode >= 400) throw new Error(`embeddings failed (${res.statusCode})`);
  const json = (await res.body.json()) as { embedding: number[] };
  return json.embedding;
}

export function toVectorLiteral(vec: number[]): string {
  return `[${vec.map((n) => (Number.isFinite(n) ? n : 0)).join(",")}]`;
}
