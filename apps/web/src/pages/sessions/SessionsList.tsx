import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Paginated, RecordingSession, SessionStatus } from "@studio-os/shared";
import { api } from "@/lib/api";
import { Badge, Button, Card, Input, Select, Spinner } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";

const STATUS_TONE: Record<SessionStatus, "green" | "amber" | "blue" | "gray" | "red"> = {
  SCHEDULED: "blue",
  IN_PROGRESS: "amber",
  TRACKING: "amber",
  MIXING: "amber",
  MASTERING: "amber",
  COMPLETED: "green",
  CANCELLED: "red",
};

export function SessionsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);

  const { data, isLoading } = useQuery({
    queryKey: ["sessions", q, status],
    queryFn: () => api.get<Paginated<RecordingSession>>(`/api/sessions?${params.toString()}`),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<RecordingSession>("/api/sessions", {
        title: "Untitled session",
        date: new Date().toISOString(),
        status: "SCHEDULED",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle="Every recording session, searchable by the AI."
        actions={
          <Button variant="primary" onClick={() => create.mutate()} disabled={create.isPending}>
            New session
          </Button>
        }
      />
      <div className="mb-4 flex gap-2">
        <Input placeholder="Search sessions…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_TONE).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>
      <Card className="p-0">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-700 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Room</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Songs</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s.id} className="border-b border-base-800 hover:bg-base-800">
                  <td className="px-4 py-2">
                    <Link to={`/sessions/${s.id}`} className="text-slate-200 hover:text-accent">{s.title}</Link>
                  </td>
                  <td className="px-4 py-2 text-slate-400">{new Date(s.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-slate-400">{s.room ?? "—"}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge></td>
                  <td className="px-4 py-2 text-slate-400">{s.songs.length}</td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600">No sessions found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
      {data && (
        <p className="mt-2 text-xs text-slate-600">{data.total} total · page {data.page}/{Math.max(1, data.totalPages)}</p>
      )}
    </div>
  );
}
