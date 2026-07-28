// Domain primitives
export * from "./types/common.js";

// Typed API contracts (zod schemas + inferred TS types) shared by api + web.
export * from "./contracts/auth.js";
export * from "./contracts/equipment.js";
export * from "./contracts/sessions.js";
export * from "./contracts/knowledge.js";
export * from "./contracts/ai.js";
export * from "./contracts/search.js";

/** Canonical API route map — a single source of truth for client + server. */
export const API_ROUTES = {
  health: "/health",
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
    changePassword: "/api/auth/change-password",
  },
  users: "/api/users",
  sessions: "/api/sessions",
  equipment: "/api/equipment",
  documents: "/api/documents",
  ai: {
    conversations: "/api/ai/conversations",
    chat: "/api/ai/chat",
    agents: "/api/ai/agents",
  },
  search: "/api/search",
} as const;
