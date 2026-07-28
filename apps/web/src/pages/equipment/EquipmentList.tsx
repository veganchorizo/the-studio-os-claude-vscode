import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Equipment, EquipmentStatus, Paginated } from "@studio-os/shared";
import { api } from "@/lib/api";
import { Badge, Button, Card, Input, Select, Spinner } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";

const STATUS_TONE: Record<EquipmentStatus, "green" | "amber" | "red" | "gray" | "blue"> = {
  OPERATIONAL: "green",
  NEEDS_SERVICE: "amber",
  IN_REPAIR: "red",
  RETIRED: "gray",
  ON_LOAN: "blue",
};

export function EquipmentPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);

  const { data, isLoading } = useQuery({
    queryKey: ["equipment", q, category],
    queryFn: () => api.get<Paginated<Equipment>>(`/api/equipment?${params.toString()}`),
  });

  const create = useMutation({
    mutationFn: () => api.post<Equipment>("/api/equipment", { manufacturer: "New", model: "Device" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });

  return (
    <div>
      <PageHeader
        title="Equipment"
        subtitle="Every piece of gear, its history and known issues."
        actions={<Button variant="primary" onClick={() => create.mutate()} disabled={create.isPending}>Add equipment</Button>}
      />
      <div className="mb-4 flex gap-2">
        <Input placeholder="Search manufacturer, model, serial…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {["MICROPHONE", "PREAMP", "COMPRESSOR", "EQ", "CONVERTER", "MONITOR", "OUTBOARD", "INSTRUMENT", "CONSOLE", "INTERFACE", "OTHER"].map((c) => (
            <option key={c} value={c}>{c}</option>
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
                <th className="px-4 py-2">Device</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Serial</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((e) => (
                <tr key={e.id} className="border-b border-base-800 hover:bg-base-800">
                  <td className="px-4 py-2">
                    <Link to={`/equipment/${e.id}`} className="text-slate-200 hover:text-accent">
                      {e.manufacturer} {e.model}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-400">{e.category}</td>
                  <td className="px-4 py-2 text-slate-400">{e.location ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{e.serial ?? "—"}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge></td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600">No equipment found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
