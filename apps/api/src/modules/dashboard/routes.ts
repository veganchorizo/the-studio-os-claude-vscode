import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  const auth = { onRequest: [app.authenticate] };

  app.get("/api/dashboard", auth, async () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const [
      todaySessions,
      upcomingSessions,
      maintenanceDue,
      recentConversations,
      openTasks,
      unreadNotes,
      equipmentNeedingService,
      openInvoices,
      recentDocuments,
    ] = await Promise.all([
      prisma.recordingSession.findMany({
        where: { date: { gte: startOfDay, lt: endOfDay } },
        orderBy: { date: "asc" },
        take: 10,
      }),
      prisma.recordingSession.findMany({
        where: { date: { gte: endOfDay }, status: { not: "CANCELLED" } },
        orderBy: { date: "asc" },
        take: 10,
      }),
      prisma.maintenanceRecord.findMany({
        where: { nextDueAt: { lte: new Date(now.getTime() + 30 * 86400000) } },
        include: { equipment: { select: { manufacturer: true, model: true } } },
        orderBy: { nextDueAt: "asc" },
        take: 10,
      }),
      prisma.conversation.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
      prisma.task.findMany({ where: { status: { in: ["TODO", "DOING"] } }, orderBy: { dueAt: "asc" }, take: 10 }),
      prisma.note.count({ where: { read: false } }),
      prisma.equipment.count({ where: { status: { in: ["NEEDS_SERVICE", "IN_REPAIR"] } } }),
      prisma.invoice.findMany({ where: { status: { in: ["SENT", "OVERDUE"] } }, orderBy: { dueAt: "asc" }, take: 10 }),
      prisma.document.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    return {
      todaySessions,
      upcomingSessions,
      maintenanceDue,
      recentConversations,
      openTasks,
      unreadNotesCount: unreadNotes,
      equipmentNeedingServiceCount: equipmentNeedingService,
      openInvoices,
      recentDocuments,
    };
  });
}
