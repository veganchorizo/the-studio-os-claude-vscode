/**
 * Seed script. Idempotent: safe to run repeatedly.
 * Creates the bootstrap admin (if no users exist) and a small amount of
 * realistic studio demo data so the UI is not empty on first boot.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log("[seed] users already exist, skipping admin bootstrap");
    return;
  }
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "change-me-admin";
  const email = process.env.ADMIN_EMAIL ?? null;
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { username, email, passwordHash, role: "ADMIN", displayName: "Studio Admin" },
  });
  console.log(`[seed] created admin user '${username}'`);
}

async function seedSettings(): Promise<void> {
  const defaults: Record<string, unknown> = {
    "ai.llmModel": process.env.LLM_MODEL ?? "llama3.1:8b",
    "ai.embeddingModel": process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
    "ai.embeddingDim": Number(process.env.EMBEDDING_DIM ?? 768),
    "ingest.chunkSize": Number(process.env.CHUNK_SIZE ?? 1000),
    "ingest.chunkOverlap": Number(process.env.CHUNK_OVERLAP ?? 150),
    "ui.theme": "dark",
    "dashboard.widgets": [
      "todaySessions",
      "upcomingSessions",
      "maintenanceReminders",
      "recentConversations",
      "tasks",
      "unreadNotes",
      "equipmentNeedingService",
      "openInvoices",
      "recentDocuments",
    ],
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as object },
    });
  }
  console.log("[seed] settings ensured");
}

async function seedDemo(): Promise<void> {
  if ((await prisma.equipment.count()) > 0) {
    console.log("[seed] demo data already present, skipping");
    return;
  }

  const u87 = await prisma.equipment.create({
    data: {
      manufacturer: "Neumann",
      model: "U87 Ai",
      category: "MICROPHONE",
      serial: "NEU-000123",
      status: "OPERATIONAL",
      location: "Mic Locker A",
      favoriteUses: ["Lead vocals", "Acoustic guitar"],
      signalChainTags: ["large-diaphragm", "condenser"],
    },
  });

  const la2a = await prisma.equipment.create({
    data: {
      manufacturer: "Universal Audio",
      model: "LA-2A",
      category: "COMPRESSOR",
      serial: "UA-778812",
      status: "NEEDS_SERVICE",
      location: "Rack 2",
      rack: "R2",
      rackUnit: 4,
      knownIssues: ["Slight hum on channel"],
      favoriteUses: ["Vocal leveling", "Bass DI"],
    },
  });

  await prisma.maintenanceRecord.create({
    data: {
      equipmentId: la2a.id,
      kind: "TUBE_REPLACEMENT",
      performedBy: "Tech Bench",
      notes: "Replaced 12AX7, biased.",
      nextDueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
  });

  const client = await prisma.client.create({
    data: { name: "Riverside Records", email: "booking@riverside.local", coffeePreference: "Oat flat white" },
  });
  const artist = await prisma.artist.create({
    data: { name: "The Delta Echoes", genres: ["indie", "folk"], clientId: client.id },
  });
  const project = await prisma.project.create({
    data: { title: "Sophomore LP", clientId: client.id, artistId: artist.id },
  });

  await prisma.recordingSession.create({
    data: {
      title: "Vocal tracking — 'Ashes'",
      status: "TRACKING",
      date: new Date(),
      room: "Studio A",
      artistId: artist.id,
      projectId: project.id,
      clientId: client.id,
      outboard: ["LA-2A", "1073 preamp"],
      micUses: [{ equipmentId: u87.id, source: "Lead vocal", position: "6in, slight off-axis" }],
      cueMixes: [{ name: "Vocalist", notes: "More reverb, less click" }],
      songs: { create: [{ title: "Ashes", bpm: 92, key: "Am" }] },
      equipment: { connect: [{ id: u87.id }, { id: la2a.id }] },
    },
  });

  await prisma.inventoryItem.createMany({
    data: [
      { name: "XLR cable 20ft", category: "CABLE", quantity: 24, reorderLevel: 10, unit: "pcs" },
      { name: "D'Addario EXL110 strings", category: "STRINGS", quantity: 3, reorderLevel: 6, unit: "sets" },
      { name: "Gaff tape (black)", category: "CONSUMABLE", quantity: 2, reorderLevel: 4, unit: "rolls" },
    ],
  });

  console.log("[seed] demo studio data created");
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedSettings();
  await seedDemo();
}

main()
  .catch((err) => {
    console.error("[seed] failed", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
