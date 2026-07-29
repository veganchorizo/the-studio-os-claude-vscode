import type { FastifyInstance } from "fastify";
import type { AgentDefinition } from "../modules/ai/agents.js";
import type { DomainEvent, PluginCommand, StudioPlugin } from "./types.js";

/**
 * In-process plugin registry. All plugins are local; there is no network
 * discovery or remote code loading. Plugins are registered at boot.
 */
class PluginRegistry {
  private readonly plugins = new Map<string, StudioPlugin>();
  private readonly extraAgents: AgentDefinition[] = [];

  register(plugin: StudioPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin '${plugin.id}' is already registered`);
    }
    this.plugins.set(plugin.id, plugin);
    if (plugin.agents) this.extraAgents.push(...plugin.agents);
  }

  list(): StudioPlugin[] {
    return [...this.plugins.values()];
  }

  agents(): AgentDefinition[] {
    return [...this.extraAgents];
  }

  commands(): PluginCommand[] {
    return this.list().flatMap((p) => p.commands ?? []);
  }

  async registerRoutes(app: FastifyInstance): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.registerRoutes) {
        await app.register(async (scoped) => {
          await plugin.registerRoutes!(scoped);
        });
      }
    }
  }

  /** Fan out a domain event to all interested plugin automations. */
  async emit(event: DomainEvent): Promise<void> {
    for (const plugin of this.plugins.values()) {
      for (const auto of plugin.automations ?? []) {
        if (auto.on === event.type) {
          try {
            await auto.run(event);
          } catch (err) {
            console.error(`[plugin:${plugin.id}] automation '${auto.id}' failed`, err);
          }
        }
      }
    }
  }
}

export const pluginRegistry = new PluginRegistry();
