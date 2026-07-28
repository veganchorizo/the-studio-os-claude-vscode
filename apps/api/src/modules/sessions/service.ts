import type {
  CreateSessionInput,
  UpdateSessionInput,
  SessionListQuery,
  RecordingSession,
  RecordingSessionDetail,
  Paginated,
  MicUse,
  CueMix,
} from "@studio-os/shared";
import type { Prisma as PrismaNS } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";

type SessionRow = PrismaNS.RecordingSessionGetPayload<{
  include: { songs: true };
}>;

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function toDto(s: SessionRow): RecordingSession {
  return {
    id: s.id,
    title: s.title,
    status: s.status,
    date: s.date.toISOString(),
    endDate: iso(s.endDate),
    room: s.room,
    artistId: s.artistId,
    projectId: s.projectId,
    clientId: s.clientId,
    engineerId: s.engineerId,
    assistantId: s.assistantId,
    notes: s.notes,
    problems: s.problems,
    patching: s.patching,
    outboard: s.outboard,
    deliverables: s.deliverables,
    micUses: (s.micUses as unknown as MicUse[]) ?? [],
    cueMixes: (s.cueMixes as unknown as CueMix[]) ?? [],
    songs: s.songs.map((song) => ({
      id: song.id,
      title: song.title,
      bpm: song.bpm,
      key: song.key,
      notes: song.notes,
    })),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export const sessionService = {
  async list(query: SessionListQuery): Promise<Paginated<RecordingSession>> {
    const where: PrismaNS.RecordingSessionWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.artistId) where.artistId = query.artistId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { notes: { contains: query.q, mode: "insensitive" } },
        { problems: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const [total, rows] = await Promise.all([
      prisma.recordingSession.count({ where }),
      prisma.recordingSession.findMany({
        where,
        include: { songs: true },
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

  async get(id: string): Promise<RecordingSessionDetail> {
    const s = await prisma.recordingSession.findUnique({
      where: { id },
      include: {
        songs: true,
        mixRevisions: { orderBy: { version: "desc" } },
        documents: { select: { id: true, type: true } },
        invoices: { select: { id: true } },
      },
    });
    if (!s) throw notFound("Session", id);
    const base = toDto(s);
    const photoDocs = s.documents.filter((d) => d.type === "IMAGE").map((d) => d.id);
    const fileDocs = s.documents.filter((d) => d.type !== "IMAGE").map((d) => d.id);
    return {
      ...base,
      mixRevisions: s.mixRevisions.map((m) => ({
        id: m.id,
        version: m.version,
        label: m.label,
        notes: m.notes,
        documentId: m.documentId,
        createdAt: m.createdAt.toISOString(),
      })),
      photoDocumentIds: photoDocs,
      fileDocumentIds: fileDocs,
      invoiceIds: s.invoices.map((i) => i.id),
    };
  },

  async create(input: CreateSessionInput): Promise<RecordingSession> {
    const s = await prisma.recordingSession.create({
      data: {
        title: input.title,
        status: input.status,
        date: new Date(input.date),
        endDate: input.endDate ? new Date(input.endDate) : null,
        room: input.room ?? null,
        artistId: input.artistId ?? null,
        projectId: input.projectId ?? null,
        clientId: input.clientId ?? null,
        engineerId: input.engineerId ?? null,
        assistantId: input.assistantId ?? null,
        notes: input.notes ?? null,
        problems: input.problems ?? null,
        patching: input.patching ?? null,
        outboard: input.outboard,
        deliverables: input.deliverables,
        micUses: input.micUses as unknown as PrismaNS.InputJsonValue,
        cueMixes: input.cueMixes as unknown as PrismaNS.InputJsonValue,
        songs: { create: input.songs.map((s) => ({ ...s })) },
        equipment: {
          connect: [...new Set(input.micUses.map((m) => m.equipmentId))].map((id) => ({ id })),
        },
      },
      include: { songs: true },
    });
    return toDto(s);
  },

  async update(id: string, input: UpdateSessionInput): Promise<RecordingSession> {
    const exists = await prisma.recordingSession.findUnique({ where: { id } });
    if (!exists) throw notFound("Session", id);

    const data: PrismaNS.RecordingSessionUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.status !== undefined) data.status = input.status;
    if (input.date !== undefined) data.date = new Date(input.date);
    if (input.endDate !== undefined) data.endDate = input.endDate ? new Date(input.endDate) : null;
    if (input.room !== undefined) data.room = input.room;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.problems !== undefined) data.problems = input.problems;
    if (input.patching !== undefined) data.patching = input.patching;
    if (input.outboard !== undefined) data.outboard = input.outboard;
    if (input.deliverables !== undefined) data.deliverables = input.deliverables;
    if (input.micUses !== undefined) data.micUses = input.micUses as unknown as PrismaNS.InputJsonValue;
    if (input.cueMixes !== undefined) data.cueMixes = input.cueMixes as unknown as PrismaNS.InputJsonValue;

    if (input.songs !== undefined) {
      await prisma.song.deleteMany({ where: { sessionId: id } });
      data.songs = { create: input.songs.map((s) => ({ ...s })) };
    }

    const s = await prisma.recordingSession.update({
      where: { id },
      data,
      include: { songs: true },
    });
    return toDto(s);
  },

  async remove(id: string): Promise<void> {
    const exists = await prisma.recordingSession.findUnique({ where: { id } });
    if (!exists) throw notFound("Session", id);
    await prisma.recordingSession.delete({ where: { id } });
  },

  async addMixRevision(
    sessionId: string,
    input: { label?: string; notes?: string; documentId?: string },
  ) {
    const session = await prisma.recordingSession.findUnique({
      where: { id: sessionId },
      include: { mixRevisions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!session) throw notFound("Session", sessionId);
    const nextVersion = (session.mixRevisions[0]?.version ?? 0) + 1;
    const rev = await prisma.mixRevision.create({
      data: {
        sessionId,
        version: nextVersion,
        label: input.label ?? null,
        notes: input.notes ?? null,
        documentId: input.documentId ?? null,
      },
    });
    return {
      id: rev.id,
      version: rev.version,
      label: rev.label,
      notes: rev.notes,
      documentId: rev.documentId,
      createdAt: rev.createdAt.toISOString(),
    };
  },
};
