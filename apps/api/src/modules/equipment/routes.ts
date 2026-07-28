import type { FastifyInstance } from "fastify";
import {
  createEquipmentInputSchema,
  updateEquipmentInputSchema,
  equipmentListQuerySchema,
  createMaintenanceInputSchema,
  createCalibrationInputSchema,
} from "@studio-os/shared";
import { equipmentService } from "./service.js";
import { audit } from "../../lib/audit.js";

export async function equipmentRoutes(app: FastifyInstance): Promise<void> {
  const auth = { onRequest: [app.authenticate] };
  const write = { onRequest: [app.authorize("ADMIN", "ENGINEER", "MANAGER")] };

  app.get("/api/equipment", auth, async (req) => {
    const query = equipmentListQuerySchema.parse(req.query);
    return equipmentService.list(query);
  });

  app.get("/api/equipment/needing-service", auth, async () => {
    return equipmentService.needingService();
  });

  app.get("/api/equipment/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    return equipmentService.get(id);
  });

  app.post("/api/equipment", write, async (req, reply) => {
    const input = createEquipmentInputSchema.parse(req.body);
    const created = await equipmentService.create(input);
    await audit({ userId: req.user!.id, action: "equipment.create", entity: "Equipment", entityId: created.id, ip: req.ip });
    reply.code(201);
    return created;
  });

  app.patch("/api/equipment/:id", write, async (req) => {
    const { id } = req.params as { id: string };
    const input = updateEquipmentInputSchema.parse(req.body);
    const updated = await equipmentService.update(id, input);
    await audit({ userId: req.user!.id, action: "equipment.update", entity: "Equipment", entityId: id, ip: req.ip });
    return updated;
  });

  app.delete("/api/equipment/:id", { onRequest: [app.authorize("ADMIN", "ENGINEER")] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await equipmentService.remove(id);
    await audit({ userId: req.user!.id, action: "equipment.delete", entity: "Equipment", entityId: id, ip: req.ip });
    reply.code(204);
  });

  app.post("/api/equipment/:id/maintenance", write, async (req, reply) => {
    const { id } = req.params as { id: string };
    const input = createMaintenanceInputSchema.parse(req.body);
    const rec = await equipmentService.addMaintenance(id, input);
    await audit({ userId: req.user!.id, action: "equipment.maintenance.add", entity: "Equipment", entityId: id, ip: req.ip });
    reply.code(201);
    return rec;
  });

  app.post("/api/equipment/:id/calibration", write, async (req, reply) => {
    const { id } = req.params as { id: string };
    const input = createCalibrationInputSchema.parse(req.body);
    const rec = await equipmentService.addCalibration(id, input);
    await audit({ userId: req.user!.id, action: "equipment.calibration.add", entity: "Equipment", entityId: id, ip: req.ip });
    reply.code(201);
    return rec;
  });
}
