import type { SearchQuery, SearchResponse, SearchHit, SearchEntityType } from "@studio-os/shared";
import { prisma } from "../../lib/prisma.js";
import { retrieve } from "../../lib/rag.js";

function snippet(text: string | null | undefined, len = 200): string {
  if (!text) return "";
  return text.length > len ? `${text.slice(0, len)}…` : text;
}

/**
 * Global hybrid search. Documents use the RAG hybrid retriever (vector + FTS);
 * structured entities use trigram/ILIKE keyword matching. Results are unified
 * into a single ranked list of hits with deep-link URLs.
 */
export const searchService = {
  async search(query: SearchQuery): Promise<SearchResponse> {
    const started = Date.now();
    const wanted = (t: SearchEntityType) => !query.types || query.types.includes(t);
    const hits: SearchHit[] = [];
    const q = query.q;
    const like = { contains: q, mode: "insensitive" as const };

    if (wanted("document") && query.mode !== "keyword") {
      const chunks = await retrieve(q, query.limit);
      for (const c of chunks) {
        hits.push({
          type: "document",
          id: c.documentId,
          title: c.title,
          snippet: snippet(c.content),
          score: c.score,
          keywordScore: null,
          semanticScore: c.score,
          url: `/knowledge/${c.documentId}`,
        });
      }
    }

    const tasks: Promise<void>[] = [];

    if (wanted("session")) {
      tasks.push(
        prisma.recordingSession
          .findMany({
            where: { OR: [{ title: like }, { notes: like }, { problems: like }] },
            take: query.limit,
            orderBy: { date: "desc" },
          })
          .then((rows) => {
            for (const s of rows)
              hits.push({
                type: "session",
                id: s.id,
                title: s.title,
                snippet: snippet(s.notes ?? s.problems),
                score: 0.5,
                keywordScore: 0.5,
                semanticScore: null,
                url: `/sessions/${s.id}`,
              });
          }),
      );
    }

    if (wanted("equipment")) {
      tasks.push(
        prisma.equipment
          .findMany({
            where: { OR: [{ manufacturer: like }, { model: like }, { serial: like }, { notes: like }] },
            take: query.limit,
          })
          .then((rows) => {
            for (const e of rows)
              hits.push({
                type: "equipment",
                id: e.id,
                title: `${e.manufacturer} ${e.model}`,
                snippet: snippet(e.notes ?? e.location),
                score: 0.5,
                keywordScore: 0.5,
                semanticScore: null,
                url: `/equipment/${e.id}`,
              });
          }),
      );
    }

    if (wanted("client")) {
      tasks.push(
        prisma.client
          .findMany({ where: { OR: [{ name: like }, { company: like }, { email: like }] }, take: query.limit })
          .then((rows) => {
            for (const c of rows)
              hits.push({
                type: "client",
                id: c.id,
                title: c.name,
                snippet: snippet(c.company ?? c.email),
                score: 0.5,
                keywordScore: 0.5,
                semanticScore: null,
                url: `/clients/${c.id}`,
              });
          }),
      );
    }

    if (wanted("artist")) {
      tasks.push(
        prisma.artist
          .findMany({ where: { name: like }, take: query.limit })
          .then((rows) => {
            for (const a of rows)
              hits.push({
                type: "artist",
                id: a.id,
                title: a.name,
                snippet: snippet(a.bio),
                score: 0.5,
                keywordScore: 0.5,
                semanticScore: null,
                url: `/artists/${a.id}`,
              });
          }),
      );
    }

    if (wanted("task")) {
      tasks.push(
        prisma.task
          .findMany({ where: { OR: [{ title: like }, { description: like }] }, take: query.limit })
          .then((rows) => {
            for (const t of rows)
              hits.push({
                type: "task",
                id: t.id,
                title: t.title,
                snippet: snippet(t.description),
                score: 0.4,
                keywordScore: 0.4,
                semanticScore: null,
                url: `/tasks/${t.id}`,
              });
          }),
      );
    }

    await Promise.all(tasks);
    hits.sort((a, b) => b.score - a.score);

    return {
      query: q,
      mode: query.mode,
      hits: hits.slice(0, query.limit),
      tookMs: Date.now() - started,
    };
  },
};
