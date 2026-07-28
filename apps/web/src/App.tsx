import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Spinner } from "@/components/ui";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { SessionsPage } from "@/pages/sessions/SessionsList";
import { SessionDetailPage } from "@/pages/sessions/SessionDetail";
import { EquipmentPage } from "@/pages/equipment/EquipmentList";
import { EquipmentDetailPage } from "@/pages/equipment/EquipmentDetail";
import { AssistantPage } from "@/pages/Assistant";
import { Placeholder } from "@/pages/Placeholder";

export function App() {
  const { user, loading, loadSession } = useAuth();

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-950">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        {/* Modules with backend contracts + extension points, UI to be expanded. */}
        <Route path="/artists" element={<Placeholder title="Artists" resource="/api/artists" />} />
        <Route path="/projects" element={<Placeholder title="Projects" resource="/api/projects" />} />
        <Route path="/maintenance" element={<Placeholder title="Maintenance" resource="/api/equipment/needing-service" />} />
        <Route path="/patchbay" element={<Placeholder title="Patchbay" resource="/api/patchbay/presets" />} />
        <Route path="/inventory" element={<Placeholder title="Inventory" resource="/api/inventory" />} />
        <Route path="/clients" element={<Placeholder title="Clients" resource="/api/clients" />} />
        <Route path="/tasks" element={<Placeholder title="Tasks" resource="/api/tasks" />} />
        <Route path="/calendar" element={<Placeholder title="Calendar" resource="/api/calendar" />} />
        <Route path="/knowledge" element={<Placeholder title="Knowledge Base" resource="/api/documents" />} />
        <Route path="/marketing" element={<Placeholder title="Marketing" resource="/api/marketing" />} />
        <Route path="/finance" element={<Placeholder title="Finance" resource="/api/invoices" />} />
        <Route path="/training" element={<Placeholder title="Intern Training" resource="/api/training/lessons" />} />
        <Route path="/settings" element={<Placeholder title="Settings" resource="/api/settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
