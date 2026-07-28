/**
 * Deterministic text chunker with overlap. Splits on paragraph boundaries where
 * possible and falls back to hard slicing to respect the max size.
 */
export interface Chunk {
  index: number;
  content: string;
}

export function chunkText(text: string, size = 1000, overlap = 150): Chunk[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n\n+/);
  const chunks: Chunk[] = [];
  let buffer = "";

  const flush = () => {
    const content = buffer.trim();
    if (content) chunks.push({ index: chunks.length, content });
  };

  for (const para of paragraphs) {
    if (para.length > size) {
      flush();
      buffer = "";
      for (let i = 0; i < para.length; i += size - overlap) {
        chunks.push({ index: chunks.length, content: para.slice(i, i + size) });
      }
      continue;
    }
    if ((buffer + "\n\n" + para).length > size) {
      flush();
      // Carry an overlap tail into the next buffer for context continuity.
      buffer = buffer.slice(Math.max(0, buffer.length - overlap)) + "\n\n" + para;
    } else {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
    }
  }
  flush();
  return chunks.map((c, i) => ({ ...c, index: i }));
}
