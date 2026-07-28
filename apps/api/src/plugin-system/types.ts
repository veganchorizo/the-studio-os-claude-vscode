import type { FastifyInstance } from "fastify";
import type { AgentDefinition } from "../modules/ai/agents.js";

/**
 * Server-side plugin contract. Plugins run locally, in-process, and may extend
 * the API with routes, background jobs, agents, importers, and exporters.
 * The web app has a parallel plugin contract for views/sidebar modules.
 */
export interface StudioPlugin {
  id: string;
  name: string;
  version: string;
  /** Register Fastify routes (namespaced under /api/plugins/<id> by convention). */
  registerRoutes?: (app: FastifyInstance) => Promise<void> | void;
  /** Contribute additional AI agents that share the knowledge base. */
  agents?: AgentDefinition[];
  /** Importers/exporters keyed by a stable id, surfaced in the UI. */
  importers?: PluginImporter[];
  exporters?: PluginExporter[];
  /** Commands invokable from the command palette. */
  commands?: PluginCommand[];
  /** Automations triggered by domain events. */
  automations?: PluginAutomation[];
}

export interface PluginImporter {
  id: string;
  label: string;
  accept: string[]; // mime types
  handle: (file: Buffer, filename: string) => Promise<{ documentIds: string[] }>;
}

export interface PluginExporter {
  id: string;
  label: string;
  produce: (params: Record<string, unknown>) => Promise<{ filename: string; content: Buffer }>;
}

export interface PluginCommand {
  id: string;
  title: string;
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

export type DomainEvent =
  | { type: "session.created"; sessionId: string }
  | { type: "document.indexed"; documentId: string }
  | { type: "equipment.needsService"; equipmentId: string };

export interface PluginAutomation {
  id: string;
  on: DomainEvent["type"];
  run: (event: DomainEvent) => Promise<void>;
}
