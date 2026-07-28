import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentType } from "@studio-os/shared";

export function detectType(filename: string): DocumentType {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "PDF";
    case ".doc":
    case ".docx":
      return "WORD";
    case ".md":
    case ".markdown":
      return "MARKDOWN";
    case ".txt":
      return "TEXT";
    case ".csv":
      return "CSV";
    case ".json":
      return "JSON";
    case ".xml":
      return "XML";
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".tiff":
    case ".webp":
      return "IMAGE";
    case ".mbox":
      return "MBOX";
    default:
      return "OTHER";
  }
}

/**
 * Extract plain text from a supported file. Heavy/optional parsers (PDF, Word,
 * OCR) are imported lazily so the worker starts fast and degrades gracefully
 * when a given parser or its model data is unavailable offline.
 */
export async function extractText(filePath: string, type: DocumentType): Promise<string> {
  switch (type) {
    case "TEXT":
    case "MARKDOWN":
    case "XML":
      return readFile(filePath, "utf8");
    case "JSON": {
      const raw = await readFile(filePath, "utf8");
      try {
        return JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        return raw;
      }
    }
    case "CSV":
      return readFile(filePath, "utf8");
    case "MBOX":
      return parseMbox(await readFile(filePath, "utf8"));
    case "PDF":
      return extractPdf(filePath);
    case "WORD":
      return extractWord(filePath);
    case "IMAGE":
      return extractImageOcr(filePath);
    default:
      // Best effort: treat unknown as UTF-8 text.
      try {
        return await readFile(filePath, "utf8");
      } catch {
        return "";
      }
  }
}

function parseMbox(raw: string): string {
  // Split on the mbox "From " delimiter and keep header subjects + bodies.
  return raw
    .split(/^From .*$/m)
    .map((msg) => msg.trim())
    .filter(Boolean)
    .join("\n\n---\n\n");
}

async function extractPdf(filePath: string): Promise<string> {
  try {
    const { default: pdfParse } = await import("pdf-parse");
    const buf = await readFile(filePath);
    const parsed = await pdfParse(buf);
    return parsed.text;
  } catch (err) {
    console.warn("[parser] pdf extraction unavailable:", (err as Error).message);
    return "";
  }
}

async function extractWord(filePath: string): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (err) {
    console.warn("[parser] word extraction unavailable:", (err as Error).message);
    return "";
  }
}

async function extractImageOcr(filePath: string): Promise<string> {
  if (process.env.OCR_ENABLED !== "true") return "";
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const { data } = await worker.recognize(filePath);
    await worker.terminate();
    return data.text;
  } catch (err) {
    console.warn("[parser] OCR unavailable:", (err as Error).message);
    return "";
  }
}
