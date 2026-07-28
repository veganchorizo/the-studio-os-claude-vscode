import type { FastifyInstance } from "fastify";
import type { Role } from "@studio-os/shared";
import { z } from "zod";
import { notFound } from "./errors.js";
import { audit } from "./audit.js";

/** A minimal Prisma delegate shape shared by all generated models. */
export interface Delegate {
  findMany: (args?: unknown) => Promise<unknown[]>;
  findUnique: (args: { where: { id: string } }) => Promise<unknown | null>;
  create: (args: { data: unknown }) => Promise<{ id: string }>;
  update: (args: { where: { id: string }; data: unknown }) => Promise<{ id: string }>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
  count: (args?: unknown) => Promise<number>;
}

export interface CrudOptions<TCreate extends z.ZodTypeAny, TUpdate extends z.ZodTypeAny> {
  path: string; // e.g. "/api/clients"
  entity: string; // audit entity name
  delegate: Delegate;
  createSchema: TCreate;
  updateSchema: TUpdate;
  writeRoles?: Role[];
  defaultOrderBy?: Record<string, "asc" | "desc">;
  /** Optional coercion (e.g. string dates -> Date) before persisting. */
  transform?: (data: unknown) => unknown;
}

/**
 * Registers standard list/get/create/update/delete routes for a resource.
 * Dates are serialized to ISO automatically by JSON.stringify (Date.toJSON).
 * This keeps the many secondary modules consistent and low-boilerplate while
 * the flagship modules (sessions, equipment) have bespoke services.
 */
export function registerCrud<TCreate extends z.ZodTypeAny, TUpdate extends z.ZodTypeAny>(
  app: FastifyInstance,
  opts: CrudOptions<TCreate, TUpdate>,
): void {
  const write = { onRequest: [app.authorize(...(opts.writeRoles ?? ["ADMIN", "ENGINEER", "MANAGER"]))] };
  const read = { onRequest: [app.authenticate] };
  const orderBy = opts.defaultOrderBy ?? { createdAt: "desc" };

  app.get(opts.path, read, async (req) => {
    const query = req.query as { page?: string; pageSize?: string };
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 50)));
    const [total, items] = await Promise.all([
      opts.delegate.count(),
      opts.delegate.findMany({ orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  });

  app.get(`${opts.path}/:id`, read, async (req) => {
    const { id } = req.params as { id: string };
    const row = await opts.delegate.findUnique({ where: { id } });
    if (!row) throw notFound(opts.entity, id);
    return row;
  });

  app.post(opts.path, write, async (req, reply) => {
    const data = opts.createSchema.parse(req.body);
    const payload = opts.transform ? opts.transform(data) : data;
    const created = await opts.delegate.create({ data: payload });
    await audit({ userId: req.user!.id, action: `${opts.entity}.create`, entity: opts.entity, entityId: created.id, ip: req.ip });
    reply.code(201);
    return created;
  });

  app.patch(`${opts.path}/:id`, write, async (req) => {
    const { id } = req.params as { id: string };
    const existing = await opts.delegate.findUnique({ where: { id } });
    if (!existing) throw notFound(opts.entity, id);
    const data = opts.updateSchema.parse(req.body);
    const payload = opts.transform ? opts.transform(data) : data;
    const updated = await opts.delegate.update({ where: { id }, data: payload });
    await audit({ userId: req.user!.id, action: `${opts.entity}.update`, entity: opts.entity, entityId: id, ip: req.ip });
    return updated;
  });

  app.delete(`${opts.path}/:id`, write, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await opts.delegate.findUnique({ where: { id } });
    if (!existing) throw notFound(opts.entity, id);
    await opts.delegate.delete({ where: { id } });
    await audit({ userId: req.user!.id, action: `${opts.entity}.delete`, entity: opts.entity, entityId: id, ip: req.ip });
    reply.code(204);
  });
}
