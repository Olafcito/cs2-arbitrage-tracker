import { NavLink } from "react-router-dom";
import {
  BarChart2,
  Box,
  Calculator,
  FolderOpen,
  LayoutDashboard,
  TrendingDown,
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/items", label: "Items", icon: Box },
  { to: "/cases", label: "Cases", icon: BarChart2 },
  { to: "/deals", label: "Deals", icon: TrendingDown },
  { to: "/groups", label: "Groups", icon: FolderOpen },
  { to: "/scenarios", label: "Scenarios", icon: Calculator },
];

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-44 shrink-0 bg-zinc-900 border-r border-zinc-800 h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-zinc-800">
        <span className="text-emerald-400 font-bold text-sm tracking-wide">
          CS2 ARB
        </span>
      </div>
      <nav className="flex flex-col gap-0.5 p-2 mt-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-colors",
                isActive
                  ? "bg-zinc-800 text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50",
              ].join(" ")
            }
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
