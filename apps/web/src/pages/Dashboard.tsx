import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardTitle, Badge, Spinner } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";

interface DashboardData {
  todaySessions: { id: string; title: string; room: string | null; date: string }[];
  upcomingSessions: { id: string; title: string; date: string }[];
  maintenanceDue: { id: string; kind: string; nextDueAt: string | null; equipment: { manufacturer: string; model: string } }[];
  recentConversations: { id: string; title: string; agent: string }[];
  openTasks: { id: string; title: string; priority: string; status: string }[];
  unreadNotesCount: number;
  equipmentNeedingServiceCount: number;
  openInvoices: { id: string; number: string; total: number; status: string }[];
  recentDocuments: { id: string; title: string; type: string }[];
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Command Center" subtitle="Everything running locally." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardTitle>Today&apos;s Sessions</CardTitle>
          {data.todaySessions.length === 0 && <Empty>No sessions today.</Empty>}
          {data.todaySessions.map((s) => (
            <Row key={s.id} to={`/sessions/${s.id}`} left={s.title} right={s.room ?? "—"} />
          ))}
        </Card>

        <Card>
          <CardTitle>Upcoming Sessions</CardTitle>
          {data.upcomingSessions.length === 0 && <Empty>Nothing scheduled.</Empty>}
          {data.upcomingSessions.map((s) => (
            <Row key={s.id} to={`/sessions/${s.id}`} left={s.title} right={new Date(s.date).toLocaleDateString()} />
          ))}
        </Card>

        <Card>
          <CardTitle>Maintenance Reminders</CardTitle>
          {data.maintenanceDue.length === 0 && <Empty>Nothing due.</Empty>}
          {data.maintenanceDue.map((m) => (
            <Row
              key={m.id}
              to="/maintenance"
              left={`${m.equipment.manufacturer} ${m.equipment.model}`}
              right={<Badge tone="amber">{m.kind}</Badge>}
            />
          ))}
        </Card>

        <Card>
          <CardTitle>Recent AI Conversations</CardTitle>
          {data.recentConversations.length === 0 && <Empty>No conversations yet.</Empty>}
          {data.recentConversations.map((c) => (
            <Row key={c.id} to="/assistant" left={c.title} right={<Badge tone="blue">{c.agent}</Badge>} />
          ))}
        </Card>

        <Card>
          <CardTitle>Studio Tasks</CardTitle>
          {data.openTasks.length === 0 && <Empty>All clear.</Empty>}
          {data.openTasks.map((t) => (
            <Row key={t.id} to="/tasks" left={t.title} right={<Badge tone="gray">{t.priority}</Badge>} />
          ))}
        </Card>

        <Card>
          <CardTitle>Open Invoices</CardTitle>
          {data.openInvoices.length === 0 && <Empty>No open invoices.</Empty>}
          {data.openInvoices.map((i) => (
            <Row key={i.id} to="/finance" left={`#${i.number}`} right={`$${i.total.toFixed(2)}`} />
          ))}
        </Card>

        <Card>
          <CardTitle>Recent Documentation</CardTitle>
          {data.recentDocuments.length === 0 && <Empty>Knowledge base is empty.</Empty>}
          {data.recentDocuments.map((d) => (
            <Row key={d.id} to="/knowledge" left={d.title} right={<Badge tone="gray">{d.type}</Badge>} />
          ))}
        </Card>

        <Card>
          <CardTitle>At a Glance</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Unread notes" value={data.unreadNotesCount} />
            <Stat label="Gear needs service" value={data.equipmentNeedingServiceCount} tone="red" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ to, left, right }: { to: string; left: React.ReactNode; right: React.ReactNode }) {
  return (
    <Link to={to} className="flex items-center justify-between border-b border-base-800 py-1.5 text-sm last:border-0 hover:text-accent">
      <span className="truncate text-slate-300">{left}</span>
      <span className="ml-2 shrink-0 text-slate-500">{right}</span>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-slate-600">{children}</p>;
}

function Stat({ label, value, tone = "amber" }: { label: string; value: number; tone?: "amber" | "red" }) {
  return (
    <div className="rounded-md bg-base-800 p-3">
      <div className={tone === "red" ? "text-2xl font-semibold text-signal-red" : "text-2xl font-semibold text-accent"}>
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
