import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  recordingSession: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  song: { deleteMany: vi.fn() },
  mixRevision: { create: vi.fn() },
};

vi.mock("../../lib/prisma.js", () => ({ prisma: mockPrisma }));

const { sessionService } = await import("./service.js");

const now = new Date("2026-02-02T10:00:00.000Z");
const row = {
  id: "s1",
  title: "Tracking",
  status: "TRACKING",
  date: now,
  endDate: null,
  room: "A",
  artistId: null,
  projectId: null,
  clientId: null,
  engineerId: null,
  assistantId: null,
  notes: null,
  problems: null,
  patching: null,
  outboard: [],
  deliverables: [],
  micUses: [{ equipmentId: "eq1", source: "Vox" }],
  cueMixes: [],
  songs: [{ id: "song1", title: "Ashes", bpm: 92, key: "Am", notes: null }],
  createdAt: now,
  updatedAt: now,
};

describe("sessionService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serializes mic uses and songs in list()", async () => {
    mockPrisma.recordingSession.count.mockResolvedValue(1);
    mockPrisma.recordingSession.findMany.mockResolvedValue([row]);
    const res = await sessionService.list({ page: 1, pageSize: 25, sort: "date", order: "desc" } as never);
    expect(res.items[0]!.micUses[0]!.equipmentId).toBe("eq1");
    expect(res.items[0]!.songs[0]!.title).toBe("Ashes");
    expect(res.items[0]!.date).toBe(now.toISOString());
  });

  it("auto-increments mix revision version", async () => {
    mockPrisma.recordingSession.findUnique.mockResolvedValue({ ...row, mixRevisions: [{ version: 3 }] });
    mockPrisma.mixRevision.create.mockImplementation(({ data }: never) => ({
      id: "rev1",
      version: (data as { version: number }).version,
      label: null,
      notes: null,
      documentId: null,
      createdAt: now,
    }));
    const rev = await sessionService.addMixRevision("s1", {});
    expect(rev.version).toBe(4);
  });
});
