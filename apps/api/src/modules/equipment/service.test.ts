import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  equipment: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  maintenanceRecord: { create: vi.fn() },
  calibrationRecord: { create: vi.fn() },
};

vi.mock("../../lib/prisma.js", () => ({ prisma: mockPrisma }));

const { equipmentService } = await import("./service.js");

const now = new Date("2026-01-01T00:00:00.000Z");
const baseRow = {
  id: "eq1",
  manufacturer: "Neumann",
  model: "U87",
  category: "MICROPHONE",
  serial: null,
  status: "OPERATIONAL",
  purchaseDate: null,
  purchasePrice: null,
  warrantyExpiresAt: null,
  location: null,
  rack: null,
  rackUnit: null,
  notes: null,
  favoriteUses: [],
  knownIssues: [],
  signalChainTags: [],
  manualDocumentId: null,
  createdAt: now,
  updatedAt: now,
};

describe("equipmentService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps rows to ISO-serialized DTOs in list()", async () => {
    mockPrisma.equipment.count.mockResolvedValue(1);
    mockPrisma.equipment.findMany.mockResolvedValue([baseRow]);

    const result = await equipmentService.list({
      page: 1,
      pageSize: 25,
      sort: "createdAt",
      order: "desc",
    } as never);

    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.items[0]!.createdAt).toBe(now.toISOString());
    expect(result.items[0]!.manufacturer).toBe("Neumann");
  });

  it("throws NOT_FOUND when getting a missing item", async () => {
    mockPrisma.equipment.findUnique.mockResolvedValue(null);
    await expect(equipmentService.get("missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates maintenance records with a default performedAt", async () => {
    mockPrisma.equipment.findUnique.mockResolvedValue(baseRow);
    mockPrisma.maintenanceRecord.create.mockImplementation(({ data }: never) => ({
      id: "m1",
      equipmentId: "eq1",
      kind: (data as { kind: string }).kind,
      performedAt: now,
      performedBy: null,
      notes: null,
      cost: null,
      nextDueAt: null,
      createdAt: now,
    }));

    const rec = await equipmentService.addMaintenance("eq1", { kind: "CLEANING" } as never);
    expect(rec.kind).toBe("CLEANING");
    expect(rec.performedAt).toBe(now.toISOString());
  });
});
