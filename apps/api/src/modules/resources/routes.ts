import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { registerCrud, type Delegate } from "../../lib/crud.js";

/**
 * Secondary CRUD modules. These share the generic factory so behaviour stays
 * consistent; the flagship modules (sessions, equipment, ai, search) have
 * bespoke services. Each schema below is the typed contract for that resource.
 */
export async function resourceRoutes(app: FastifyInstance): Promise<void> {
  const d = (m: unknown) => m as Delegate;

  // --- Clients -------------------------------------------------------------
  registerCrud(app, {
    path: "/api/clients",
    entity: "Client",
    delegate: d(prisma.client),
    defaultOrderBy: { name: "asc" },
    createSchema: z.object({
      name: z.string().min(1),
      company: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      preferences: z.string().optional(),
      favoriteMicIds: z.array(z.string()).default([]),
      coffeePreference: z.string().optional(),
      tags: z.array(z.string()).default([]),
      notes: z.string().optional(),
    }),
    updateSchema: z
      .object({
        name: z.string().min(1),
        company: z.string(),
        email: z.string().email(),
        phone: z.string(),
        address: z.string(),
        preferences: z.string(),
        favoriteMicIds: z.array(z.string()),
        coffeePreference: z.string(),
        tags: z.array(z.string()),
        notes: z.string(),
      })
      .partial(),
  });

  // --- Artists -------------------------------------------------------------
  registerCrud(app, {
    path: "/api/artists",
    entity: "Artist",
    delegate: d(prisma.artist),
    defaultOrderBy: { name: "asc" },
    createSchema: z.object({
      name: z.string().min(1),
      genres: z.array(z.string()).default([]),
      bio: z.string().optional(),
      notes: z.string().optional(),
      clientId: z.string().optional(),
    }),
    updateSchema: z
      .object({ name: z.string(), genres: z.array(z.string()), bio: z.string(), notes: z.string(), clientId: z.string() })
      .partial(),
  });

  // --- Projects ------------------------------------------------------------
  registerCrud(app, {
    path: "/api/projects",
    entity: "Project",
    delegate: d(prisma.project),
    createSchema: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.string().default("ACTIVE"),
      clientId: z.string().optional(),
      artistId: z.string().optional(),
      budget: z.number().optional(),
    }),
    updateSchema: z
      .object({ title: z.string(), description: z.string(), status: z.string(), clientId: z.string(), artistId: z.string(), budget: z.number() })
      .partial(),
  });

  // --- Inventory -----------------------------------------------------------
  registerCrud(app, {
    path: "/api/inventory",
    entity: "InventoryItem",
    delegate: d(prisma.inventoryItem),
    defaultOrderBy: { name: "asc" },
    createSchema: z.object({
      name: z.string().min(1),
      category: z.string().default("OTHER"),
      quantity: z.number().int().default(0),
      reorderLevel: z.number().int().default(0),
      unit: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }),
    updateSchema: z
      .object({ name: z.string(), category: z.string(), quantity: z.number().int(), reorderLevel: z.number().int(), unit: z.string(), location: z.string(), notes: z.string() })
      .partial(),
  });
  // Low-stock helper.
  app.get("/api/inventory/low-stock", { onRequest: [app.authenticate] }, async () => {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "InventoryItem" WHERE quantity <= "reorderLevel" ORDER BY name ASC`,
    );
    return rows;
  });

  // --- Tasks ---------------------------------------------------------------
  registerCrud(app, {
    path: "/api/tasks",
    entity: "Task",
    delegate: d(prisma.task),
    createSchema: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.enum(["TODO", "DOING", "DONE", "BLOCKED"]).default("TODO"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
      dueAt: z.string().datetime().optional(),
      assigneeId: z.string().optional(),
      recurrence: z.string().optional(),
    }),
    updateSchema: z
      .object({
        title: z.string(),
        description: z.string(),
        status: z.enum(["TODO", "DOING", "DONE", "BLOCKED"]),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
        dueAt: z.string().datetime().nullable(),
        assigneeId: z.string().nullable(),
        recurrence: z.string().nullable(),
      })
      .partial(),
    transform: (data) => {
      const d2 = data as { dueAt?: string | null };
      return { ...d2, dueAt: d2.dueAt ? new Date(d2.dueAt) : d2.dueAt };
    },
  });

  // --- Calendar events -----------------------------------------------------
  registerCrud(app, {
    path: "/api/calendar",
    entity: "CalendarEvent",
    delegate: d(prisma.calendarEvent),
    defaultOrderBy: { start: "asc" },
    createSchema: z.object({
      title: z.string().min(1),
      kind: z.string().default("EVENT"),
      start: z.string().datetime(),
      end: z.string().datetime().optional(),
      allDay: z.boolean().default(false),
      refType: z.string().optional(),
      refId: z.string().optional(),
      notes: z.string().optional(),
    }),
    updateSchema: z
      .object({ title: z.string(), kind: z.string(), start: z.string().datetime(), end: z.string().datetime().nullable(), allDay: z.boolean(), notes: z.string() })
      .partial(),
    transform: (data) => {
      const e = data as { start?: string; end?: string | null };
      return { ...e, start: e.start ? new Date(e.start) : undefined, end: e.end ? new Date(e.end) : e.end };
    },
  });

  // --- Notes ---------------------------------------------------------------
  registerCrud(app, {
    path: "/api/notes",
    entity: "Note",
    delegate: d(prisma.note),
    createSchema: z.object({
      title: z.string().optional(),
      body: z.string().min(1),
      refType: z.string().optional(),
      refId: z.string().optional(),
    }),
    updateSchema: z.object({ title: z.string(), body: z.string(), read: z.boolean() }).partial(),
  });

  // --- Marketing content ---------------------------------------------------
  registerCrud(app, {
    path: "/api/marketing",
    entity: "MarketingContent",
    delegate: d(prisma.marketingContent),
    writeRoles: ["ADMIN", "MANAGER"],
    createSchema: z.object({
      channel: z.string().min(1),
      title: z.string().optional(),
      body: z.string().min(1),
      status: z.string().default("DRAFT"),
    }),
    updateSchema: z.object({ channel: z.string(), title: z.string(), body: z.string(), status: z.string() }).partial(),
  });

  // --- Invoices (finance) --------------------------------------------------
  registerCrud(app, {
    path: "/api/invoices",
    entity: "Invoice",
    delegate: d(prisma.invoice),
    writeRoles: ["ADMIN", "MANAGER"],
    createSchema: z.object({
      number: z.string().min(1),
      clientId: z.string().optional(),
      projectId: z.string().optional(),
      sessionId: z.string().optional(),
      status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"]).default("DRAFT"),
      dueAt: z.string().datetime().optional(),
      currency: z.string().default("USD"),
      lineItems: z.array(z.object({ description: z.string(), qty: z.number(), unitPrice: z.number() })).default([]),
      subtotal: z.number().default(0),
      tax: z.number().default(0),
      total: z.number().default(0),
      notes: z.string().optional(),
    }),
    updateSchema: z
      .object({ status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"]), notes: z.string(), total: z.number() })
      .partial(),
    transform: (data) => {
      const i = data as { dueAt?: string; lineItems?: unknown };
      return { ...i, dueAt: i.dueAt ? new Date(i.dueAt) : undefined };
    },
  });

  // --- Patchbay presets ----------------------------------------------------
  registerCrud(app, {
    path: "/api/patchbay/presets",
    entity: "PatchPreset",
    delegate: d(prisma.patchPreset),
    createSchema: z.object({ name: z.string().min(1), description: z.string().optional() }),
    updateSchema: z.object({ name: z.string(), description: z.string() }).partial(),
  });

  // --- Training lessons ----------------------------------------------------
  registerCrud(app, {
    path: "/api/training/lessons",
    entity: "Lesson",
    delegate: d(prisma.lesson),
    defaultOrderBy: { order: "asc" },
    createSchema: z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      order: z.number().int().default(0),
      category: z.string().default("GENERAL"),
    }),
    updateSchema: z.object({ title: z.string(), body: z.string(), order: z.number().int(), category: z.string() }).partial(),
  });
}
