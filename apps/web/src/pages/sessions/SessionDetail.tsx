import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RecordingSessionDetail } from "@studio-os/shared";
import { api } from "@/lib/api";
import { Badge, Button, Card, CardTitle, Select, Textarea, Spinner } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";

const STATUSES = ["SCHEDULED", "IN_PROGRESS", "TRACKING", "MIXING", "MASTERING", "COMPLETED", "CANCELLED"];

export function SessionDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [draftNotes, setDraftNotes] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.get<RecordingSessionDetail>(`/api/sessions/${id}`),
  });

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.patch(`/api/sessions/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session", id] }),
  });

  const addRevision = useMutation({
    mutationFn: () => api.post(`/api/sessions/${id}/mix-revisions`, { label: "New revision" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session", id] }),
  });

  if (isLoading || !data) {
    return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  }

  return (
    <div>
      <PageHeader
        title={data.title}
        subtitle={`${new Date(data.date).toLocaleString()} · ${data.room ?? "no room"}`}
        actions={
          <Select
            value={data.status}
            onChange={(e) => update.mutate({ status: e.target.value })}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardTitle>Session Notes</CardTitle>
            <Textarea
              rows={5}
              value={draftNotes ?? data.notes ?? ""}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="What happened in this session…"
            />
            <div className="mt-2 flex justify-end">
              <Button
                variant="primary"
                disabled={draftNotes === null || update.isPending}
                onClick={() => update.mutate({ notes: draftNotes })}
              >
                Save notes
              </Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Songs</CardTitle>
            {data.songs.length === 0 && <p className="text-sm text-slate-600">No songs logged.</p>}
            <ul className="space-y-1">
              {data.songs.map((s) => (
                <li key={s.id} className="flex justify-between border-b border-base-800 py-1.5 text-sm last:border-0">
                  <span className="text-slate-200">{s.title}</span>
                  <span className="text-slate-500">{s.bpm ? `${s.bpm} BPM` : ""} {s.key ?? ""}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle>Microphones & Signal Path</CardTitle>
            {data.micUses.length === 0 && <p className="text-sm text-slate-600">No mics logged.</p>}
            <ul className="space-y-1 text-sm">
              {data.micUses.map((m, i) => (
                <li key={i} className="flex justify-between border-b border-base-800 py-1.5 last:border-0">
                  <span className="text-slate-200">{m.source}</span>
                  <Link to={`/equipment/${m.equipmentId}`} className="text-slate-500 hover:text-accent">{m.position ?? "mic"}</Link>
                </li>
              ))}
            </ul>
            {data.outboard.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-xs uppercase text-slate-500">Outboard</div>
                <div className="flex flex-wrap gap-1">
                  {data.outboard.map((o, i) => <Badge key={i} tone="gray">{o}</Badge>)}
                </div>
              </div>
            )}
          </Card>

          {data.problems && (
            <Card>
              <CardTitle>Problems Encountered</CardTitle>
              <p className="whitespace-pre-wrap text-sm text-slate-300">{data.problems}</p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitle>Cue Mixes</CardTitle>
            {data.cueMixes.length === 0 && <p className="text-sm text-slate-600">None.</p>}
            {data.cueMixes.map((c, i) => (
              <div key={i} className="border-b border-base-800 py-1.5 text-sm last:border-0">
                <div className="text-slate-200">{c.name}</div>
                <div className="text-xs text-slate-500">{c.notes}</div>
              </div>
            ))}
          </Card>

          <Card>
            <CardTitle>Mix Revisions</CardTitle>
            <div className="mb-2">
              <Button variant="secondary" onClick={() => addRevision.mutate()} disabled={addRevision.isPending}>
                Add revision
              </Button>
            </div>
            {data.mixRevisions.map((r) => (
              <div key={r.id} className="flex justify-between border-b border-base-800 py-1.5 text-sm last:border-0">
                <span className="text-slate-200">v{r.version} {r.label ?? ""}</span>
                <span className="text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </Card>

          <Card>
            <CardTitle>Attachments</CardTitle>
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <Stat label="Photos" value={data.photoDocumentIds.length} />
              <Stat label="Files" value={data.fileDocumentIds.length} />
              <Stat label="Invoices" value={data.invoiceIds.length} />
              <Stat label="Deliverables" value={data.deliverables.length} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-base-800 p-2">
      <div className="text-lg font-semibold text-accent">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
