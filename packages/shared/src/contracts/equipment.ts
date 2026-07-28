import { z } from "zod";

export const equipmentCategorySchema = z.enum([
  "MICROPHONE",
  "PREAMP",
  "COMPRESSOR",
  "EQ",
  "CONVERTER",
  "MONITOR",
  "OUTBOARD",
  "INSTRUMENT",
  "AMPLIFIER",
  "CONSOLE",
  "COMPUTER",
  "INTERFACE",
  "CABLE",
  "OTHER",
]);
export type EquipmentCategory = z.infer<typeof equipmentCategorySchema>;

export const equipmentStatusSchema = z.enum([
  "OPERATIONAL",
  "NEEDS_SERVICE",
  "IN_REPAIR",
  "RETIRED",
  "ON_LOAN",
]);
export type EquipmentStatus = z.infer<typeof equipmentStatusSchema>;

export const maintenanceKindSchema = z.enum([
  "TUBE_REPLACEMENT",
  "CALIBRATION",
  "CLEANING",
  "FIRMWARE",
  "REPAIR",
  "CONSUMABLE",
  "INSPECTION",
]);
export type MaintenanceKind = z.infer<typeof maintenanceKindSchema>;

export const maintenanceRecordSchema = z.object({
  id: z.string(),
  equipmentId: z.string(),
  kind: maintenanceKindSchema,
  performedAt: z.string().datetime(),
  performedBy: z.string().nullable(),
  notes: z.string().nullable(),
  cost: z.number().nonnegative().nullable(),
  nextDueAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type MaintenanceRecord = z.infer<typeof maintenanceRecordSchema>;

export const calibrationRecordSchema = z.object({
  id: z.string(),
  equipmentId: z.string(),
  performedAt: z.string().datetime(),
  standard: z.string().nullable(),
  result: z.string().nullable(),
  passed: z.boolean(),
  notes: z.string().nullable(),
  nextDueAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type CalibrationRecord = z.infer<typeof calibrationRecordSchema>;

export const equipmentSchema = z.object({
  id: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  category: equipmentCategorySchema,
  serial: z.string().nullable(),
  status: equipmentStatusSchema,
  purchaseDate: z.string().datetime().nullable(),
  purchasePrice: z.number().nonnegative().nullable(),
  warrantyExpiresAt: z.string().datetime().nullable(),
  location: z.string().nullable(),
  rack: z.string().nullable(),
  rackUnit: z.number().int().nullable(),
  notes: z.string().nullable(),
  favoriteUses: z.array(z.string()),
  knownIssues: z.array(z.string()),
  signalChainTags: z.array(z.string()),
  manualDocumentId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Equipment = z.infer<typeof equipmentSchema>;

export const equipmentWithHistorySchema = equipmentSchema.extend({
  maintenance: z.array(maintenanceRecordSchema),
  calibrations: z.array(calibrationRecordSchema),
  relatedSessionIds: z.array(z.string()),
});
export type EquipmentWithHistory = z.infer<typeof equipmentWithHistorySchema>;

export const createEquipmentInputSchema = z.object({
  manufacturer: z.string().min(1).max(200),
  model: z.string().min(1).max(200),
  category: equipmentCategorySchema.default("OTHER"),
  serial: z.string().max(200).optional(),
  status: equipmentStatusSchema.default("OPERATIONAL"),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  warrantyExpiresAt: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  rack: z.string().max(100).optional(),
  rackUnit: z.number().int().optional(),
  notes: z.string().max(10000).optional(),
  favoriteUses: z.array(z.string()).default([]),
  knownIssues: z.array(z.string()).default([]),
  signalChainTags: z.array(z.string()).default([]),
  manualDocumentId: z.string().optional(),
});
export type CreateEquipmentInput = z.infer<typeof createEquipmentInputSchema>;

export const updateEquipmentInputSchema = createEquipmentInputSchema.partial();
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentInputSchema>;

export const equipmentListQuerySchema = z.object({
  q: z.string().optional(),
  category: equipmentCategorySchema.optional(),
  status: equipmentStatusSchema.optional(),
  location: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.enum(["createdAt", "manufacturer", "model", "status"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type EquipmentListQuery = z.infer<typeof equipmentListQuerySchema>;

export const createMaintenanceInputSchema = z.object({
  kind: maintenanceKindSchema,
  performedAt: z.string().datetime().optional(),
  performedBy: z.string().max(200).optional(),
  notes: z.string().max(10000).optional(),
  cost: z.number().nonnegative().optional(),
  nextDueAt: z.string().datetime().optional(),
});
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceInputSchema>;

export const createCalibrationInputSchema = z.object({
  performedAt: z.string().datetime().optional(),
  standard: z.string().max(200).optional(),
  result: z.string().max(2000).optional(),
  passed: z.boolean().default(true),
  notes: z.string().max(10000).optional(),
  nextDueAt: z.string().datetime().optional(),
});
export type CreateCalibrationInput = z.infer<typeof createCalibrationInputSchema>;
