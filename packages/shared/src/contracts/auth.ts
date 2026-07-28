import { z } from "zod";
import { roleSchema } from "../types/common.js";

export const loginInputSchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(512),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().nullable(),
  role: roleSchema,
  displayName: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;

export const sessionUserSchema = userSchema;
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(8).max(512),
  email: z.string().email().optional(),
  role: roleSchema.default("VIEWER"),
  displayName: z.string().max(200).optional(),
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(512),
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
