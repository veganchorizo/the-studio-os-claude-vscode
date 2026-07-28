import { z } from "zod";

/** Branded ID helpers keep entity ids from being accidentally interchanged. */
export const idSchema = z.string().cuid2().or(z.string().uuid()).or(z.string().min(1));

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalPages: z.number().int().nonnegative(),
  });
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Roles used by the RBAC layer. */
export const roleSchema = z.enum(["ADMIN", "ENGINEER", "MANAGER", "INTERN", "VIEWER"]);
export type Role = z.infer<typeof roleSchema>;

export const timestamps = {
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};
