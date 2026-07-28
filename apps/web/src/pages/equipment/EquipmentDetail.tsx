import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EquipmentWithHistory } from "@studio-os/shared";
import { api } from "@/lib/api";
import { Badge, Button, Card, CardTitle, Select, Spinner } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";

const MAINT_KINDS = ["TUBE_REPLACEMENT", "CALIBRATION", "CLEANING", "FIRMWARE", "REPAIR", "CONSUMABLE", "INSPECTION"];
const STATUSES = ["OPERATIONAL", "NEEDS_SERVICE", "IN_REPAIR", "RETIRED", "ON_LOAN"];

export function EquipmentDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["equipment", id],
    queryFn: () => api.get<EquipmentWithHistory>(`/api/equipment/${id}`),
  });

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.patch(`/api/equipment/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment", id] }),
  });

  const addMaintenance = useMutation({
    mutationFn: (kind: string) => api.post(`/api/equipment/${id}/maintenance`, { kind, performedAt: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment", id] }),
  });

  if (isLoading || !data) {
    return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  }

  return (
    <div>
      <PageHeader
        title={`${data.manufacturer} ${data.model}`}
        subtitle={`${data.category}${data.serial ? ` · SN ${data.serial}` : ""}`}
        actions={
          <Select value={data.status} onChange={(e) => update.mutate({ status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardTitle>Details</CardTitle>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Location" value={data.location} />
              <Detail label="Rack" value={data.rack ? `${data.rack} ${data.rackUnit ? `U${data.rackUnit}` : ""}` : null} />
              <Detail label="Purchased" value={data.purchaseDate ? new Date(data.purchaseDate).toLocaleDateString() : null} />
              <Detail label="Warranty" value={data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt).toLocaleDateString() : null} />
            </dl>
            {data.favoriteUses.length > 0 && (
              <TagRow title="Favorite uses" tags={data.favoriteUses} tone="green" />
            )}
            {data.signalChainTags.length > 0 && (
              <TagRow title="Signal chain" tags={data.signalChainTags} tone="blue" />
            )}
            {data.knownIssues.length > 0 && (
              <TagRow title="Known issues" tags={data.knownIssues} tone="red" />
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle className="mb-0">Maintenance History</CardTitle>
              <div className="flex items-center gap-2">
                <Select id="maint-kind" defaultValue="CLEANING" className="text-xs">
                  {MAINT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </Select>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const el = document.getElementById("maint-kind") as HTMLSelectElement | null;
                    addMaintenance.mutate(el?.value ?? "CLEANING");
                  }}
                  disabled={addMaintenance.isPending}
                >
                  Log
                </Button>
              </div>
            </div>
            {data.maintenance.length === 0 && <p className="text-sm text-slate-600">No maintenance recorded.</p>}
            {data.maintenance.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-base-800 py-1.5 text-sm last:border-0">
                <div>
                  <Badge tone="amber">{m.kind}</Badge>
                  <span className="ml-2 text-slate-400">{m.notes ?? m.performedBy ?? ""}</span>
                </div>
                <span className="text-xs text-slate-500">{new Date(m.performedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </Card>

          <Card>
            <CardTitle>Calibration History</CardTitle>
            {data.calibrations.length === 0 && <p className="text-sm text-slate-600">No calibration recorded.</p>}
            {data.calibrations.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-base-800 py-1.5 text-sm last:border-0">
                <span>{c.standard ?? "Calibration"} · <Badge tone={c.passed ? "green" : "red"}>{c.passed ? "PASS" : "FAIL"}</Badge></span>
                <span className="text-xs text-slate-500">{new Date(c.performedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitle>Related Sessions</CardTitle>
            {data.relatedSessionIds.length === 0 && <p className="text-sm text-slate-600">No linked sessions.</p>}
            <div className="text-sm text-slate-400">{data.relatedSessionIds.length} session(s)</div>
          </Card>
          {data.notes && (
            <Card>
              <CardTitle>Notes</CardTitle>
              <p className="whitespace-pre-wrap text-sm text-slate-300">{data.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value ?? "—"}</dd>
    </div>
  );
}

function TagRow({ title, tags, tone }: { title: string; tags: string[]; tone: "green" | "blue" | "red" }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs uppercase text-slate-500">{title}</div>
      <div className="flex flex-wrap gap-1">
        {tags.map((t, i) => <Badge key={i} tone={tone}>{t}</Badge>)}
      </div>
    </div>
  );
}
