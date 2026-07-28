import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Mic2,
  Users,
  FolderKanban,
  Sliders,
  Wrench,
  Cable,
  Boxes,
  Contact,
  CheckSquare,
  Calendar,
  BookOpen,
  Bot,
  Megaphone,
  DollarSign,
  GraduationCap,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

/** Left sidebar navigation. Plugins may append additional items at runtime. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Sessions", to: "/sessions", icon: Mic2 },
  { label: "Artists", to: "/artists", icon: Users },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Equipment", to: "/equipment", icon: Sliders },
  { label: "Maintenance", to: "/maintenance", icon: Wrench },
  { label: "Patchbay", to: "/patchbay", icon: Cable },
  { label: "Inventory", to: "/inventory", icon: Boxes },
  { label: "Clients", to: "/clients", icon: Contact },
  { label: "Tasks", to: "/tasks", icon: CheckSquare },
  { label: "Calendar", to: "/calendar", icon: Calendar },
  { label: "Knowledge Base", to: "/knowledge", icon: BookOpen },
  { label: "AI Assistant", to: "/assistant", icon: Bot },
  { label: "Marketing", to: "/marketing", icon: Megaphone },
  { label: "Finance", to: "/finance", icon: DollarSign },
  { label: "Intern Training", to: "/training", icon: GraduationCap },
  { label: "Settings", to: "/settings", icon: Settings },
];
