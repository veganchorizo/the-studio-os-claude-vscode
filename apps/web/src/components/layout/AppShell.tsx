import { Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui";

export function AppShell() {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-screen overflow-hidden bg-base-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b border-base-700 bg-base-900 px-4 py-2.5">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {user?.displayName ?? user?.username}{" "}
              <span className="text-xs text-slate-600">({user?.role})</span>
            </span>
            <Button variant="ghost" onClick={() => void logout()} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
