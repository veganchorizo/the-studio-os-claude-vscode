# Plugin architecture

Plugins extend The Studio OS **locally and in-process**. There is no remote
discovery, marketplace, or network code loading — consistent with the offline,
privacy-first philosophy.

## Server plugins

A server plugin implements the `StudioPlugin` contract
(`apps/api/src/plugin-system/types.ts`) and is registered at boot via the
`pluginRegistry`. It can contribute:

- **Routes** — namespaced Fastify routes.
- **Agents** — additional AI personas that share the same knowledge base.
- **Importers / Exporters** — new file formats and export targets.
- **Commands** — command-palette actions.
- **Automations** — reactions to domain events (`session.created`, `document.indexed`, …).

### Example

```ts
import type { StudioPlugin } from "../plugin-system/types.js";

export const roomToneAnalyzer: StudioPlugin = {
  id: "room-tone-analyzer",
  name: "Room Tone Analyzer",
  version: "1.0.0",
  agents: [
    {
      kind: "CHIEF_ENGINEER",
      name: "Acoustics Advisor",
      description: "Suggests treatment based on room measurements.",
      systemPrompt: "You are an acoustics specialist... cite sources with [[n]].",
    },
  ],
  registerRoutes(app) {
    app.get("/api/plugins/room-tone/health", async () => ({ ok: true }));
  },
  automations: [
    {
      id: "notify-on-index",
      on: "document.indexed",
      async run(event) {
        console.log("indexed", event);
      },
    },
  ],
};
```

Register it in `apps/api/src/app.ts` before `pluginRegistry.registerRoutes`:

```ts
import { pluginRegistry } from "./plugin-system/registry.js";
import { roomToneAnalyzer } from "./plugins/room-tone-analyzer.js";

pluginRegistry.register(roomToneAnalyzer);
```

## Web plugins

The sidebar reads from `apps/web/src/components/layout/nav.ts`. A web plugin
contributes nav items, routes, and views. Because the SPA is bundled at build
time, web plugins are compiled in; the nav array is intentionally the single
extension point so a plugin build step can append to it.

## Domain events

The API emits domain events through `pluginRegistry.emit(...)`. Automations
subscribe by `on` type and run sequentially, isolated so one failing plugin
cannot break a request. Add new event types to the `DomainEvent` union.
