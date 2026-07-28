import type {
  CreateEquipmentInput,
  UpdateEquipmentInput,
  EquipmentListQuery,
  Equipment,
  EquipmentWithHistory,
  CreateMaintenanceInput,
  CreateCalibrationInput,
  MaintenanceRecord,
  CalibrationRecord,
  Paginated,
} from "@studio-os/shared";
import type { Prisma as PrismaNS } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

type EquipRow = PrismaNS.EquipmentGetPayload<Record<string, never>>;

function toDto(e: EquipRow): Equipment {
  return {
    id: e.id,
    manufacturer: e.manufacturer,
    model: e.model,
    category: e.category,
    serial: e.serial,
    status: e.status,
    purchaseDate: iso(e.purchaseDate),
    purchasePrice: e.purchasePrice,
    warrantyExpiresAt: iso(e.warrantyExpiresAt),
    location: e.location,
    rack: e.rack,
    rackUnit: e.rackUnit,
    notes: e.notes,
    favoriteUses: e.favoriteUses,
    knownIssues: e.knownIssues,
    signalChainTags: e.signalChainTags,
    manualDocumentId: e.manualDocumentId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function toMaintenance(m: PrismaNS.MaintenanceRecordGetPayload<Record<string, never>>): MaintenanceRecord {
  return {
    id: m.id,
    equipmentId: m.equipmentId,
    kind: m.kind,
    performedAt: m.performedAt.toISOString(),
    performedBy: m.performedBy,
    notes: m.notes,
    cost: m.cost,
    nextDueAt: iso(m.nextDueAt),
    createdAt: m.createdAt.toISOString(),
  };
}

function toCalibration(c: PrismaNS.CalibrationRecordGetPayload<Record<string, never>>): CalibrationRecord {
  return {
    id: c.id,
    equipmentId: c.equipmentId,
    performedAt: c.performedAt.toISOString(),
    standard: c.standard,
    result: c.result,
    passed: c.passed,
    notes: c.notes,
    nextDueAt: iso(c.nextDueAt),
    createdAt: c.createdAt.toISOString(),
  };
}

export const equipmentService = {
  async list(query: EquipmentListQuery): Promise<Paginated<Equipment>> {
    const where: PrismaNS.EquipmentWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    if (query.location) where.location = { contains: query.location, mode: "insensitive" };
    if (query.q) {
      where.OR = [
        { manufacturer: { contains: query.q, mode: "insensitive" } },
        { model: { contains: query.q, mode: "insensitive" } },
        { serial: { contains: query.q, mode: "insensitive" } },
        { notes: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.findMany({
        where,
        orderBy: { [query.sort]: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items: rows.map(toDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  },

  async get(id: string): Promise<EquipmentWithHistory> {
    const e = await prisma.equipment.findUnique({
      where: { id },
      include: {
        maintenance: { orderBy: { performedAt: "desc" } },
        calibrations: { orderBy: { performedAt: "desc" } },
        sessions: { select: { id: true } },
      },
    });
    if (!e) throw notFound("Equipment", id);
    return {
      ...toDto(e),
      maintenance: e.maintenance.map(toMaintenance),
      calibrations: e.calibrations.map(toCalibration),
      relatedSessionIds: e.sessions.map((s) => s.id),
    };
  },

  async create(input: CreateEquipmentInput): Promise<Equipment> {
    const e = await prisma.equipment.create({
      data: {
        manufacturer: input.manufacturer,
        model: input.model,
        category: input.category,
        serial: input.serial ?? null,
        status: input.status,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
        purchasePrice: input.purchasePrice ?? null,
        warrantyExpiresAt: input.warrantyExpiresAt ? new Date(input.warrantyExpiresAt) : null,
        location: input.location ?? null,
        rack: input.rack ?? null,
        rackUnit: input.rackUnit ?? null,
        notes: input.notes ?? null,
        favoriteUses: input.favoriteUses,
        knownIssues: input.knownIssues,
        signalChainTags: input.signalChainTags,
        manualDocumentId: input.manualDocumentId ?? null,
      },
    });
    return toDto(e);
  },

  async update(id: string, input: UpdateEquipmentInput): Promise<Equipment> {
    const exists = await prisma.equipment.findUnique({ where: { id } });
    if (!exists) throw notFound("Equipment", id);
    const e = await prisma.equipment.update({
      where: { id },
      data: {
        ...input,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
        warrantyExpiresAt: input.warrantyExpiresAt ? new Date(input.warrantyExpiresAt) : undefined,
      },
    });
    return toDto(e);
  },

  async remove(id: string): Promise<void> {
    const exists = await prisma.equipment.findUnique({ where: { id } });
    if (!exists) throw notFound("Equipment", id);
    await prisma.equipment.delete({ where: { id } });
  },

  async addMaintenance(equipmentId: string, input: CreateMaintenanceInput): Promise<MaintenanceRecord> {
    const exists = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!exists) throw notFound("Equipment", equipmentId);
    const rec = await prisma.maintenanceRecord.create({
      data: {
        equipmentId,
        kind: input.kind,
        performedAt: input.performedAt ? new Date(input.performedAt) : new Date(),
        performedBy: input.performedBy ?? null,
        notes: input.notes ?? null,
        cost: input.cost ?? null,
        nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : null,
      },
    });
    return toMaintenance(rec);
  },

  async addCalibration(equipmentId: string, input: CreateCalibrationInput): Promise<CalibrationRecord> {
    const exists = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!exists) throw notFound("Equipment", equipmentId);
    const rec = await prisma.calibrationRecord.create({
      data: {
        equipmentId,
        performedAt: input.performedAt ? new Date(input.performedAt) : new Date(),
        standard: input.standard ?? null,
        result: input.result ?? null,
        passed: input.passed,
        notes: input.notes ?? null,
        nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : null,
      },
    });
    return toCalibration(rec);
  },

  /** Equipment that is flagged for service or has overdue maintenance. */
  async needingService(): Promise<Equipment[]> {
    const rows = await prisma.equipment.findMany({
      where: {
        OR: [
          { status: { in: ["NEEDS_SERVICE", "IN_REPAIR"] } },
          { maintenance: { some: { nextDueAt: { lte: new Date() } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return rows.map(toDto);
  },
};
