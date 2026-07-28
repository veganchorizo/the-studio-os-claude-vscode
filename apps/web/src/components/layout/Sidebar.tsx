import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/cn";

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-base-700 bg-base-900">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-accent font-mono text-sm font-bold text-base-950">
          S
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-100">Studio OS</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">offline</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-base-700 text-accent"
                  : "text-slate-400 hover:bg-base-800 hover:text-slate-200",
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-base-700 px-4 py-3 text-[10px] text-slate-600">
        100% local · no cloud
      </div>
    </aside>
  );
}
