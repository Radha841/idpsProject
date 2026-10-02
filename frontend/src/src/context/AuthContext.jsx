import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity, Bell, Blocks, FileSearch, FileUp, LayoutDashboard, ListChecks,
  Menu, Shield, Siren, UploadCloud, X, LogOut, UserRound, FileText
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  ["/dashboard", LayoutDashboard, "Dashboard"],
  ["/alerts", Bell, "Alerts"],
  ["/incidents", Siren, "Incident Timeline"],
  ["/logs", FileSearch, "Log Explorer"],
  ["/upload", UploadCloud, "Upload Logs"],
  ["/rules", ListChecks, "Rules"],
  ["/blocked-ips", Blocks, "Blocked IPs"],
  ["/reports", FileText, "Reports"]
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = links.find(([path]) => location.pathname.startsWith(path))?.[2] || "Dashboard";

  return (
    <div className="min-h-screen bg-slate-50">
      {open && <div className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-slate-950 text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-2 font-bold"><Shield size={22} /> IDPS Monitor</div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>
        <nav className="space-y-1 p-3">
          {links.map(([path, Icon, label]) => (
            <NavLink key={path} to={path} onClick={() => setOpen(false)}
              className={({isActive}) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
              <Icon size={18}/>{label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-700"><UserRound size={17}/></div>
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{user?.username}</div><div className="text-xs text-slate-400">{user?.role}</div></div>
          </div>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"><LogOut size={17}/> Sign out</button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu size={21}/></button>
            <div><h1 className="text-lg font-bold">{title}</h1><p className="hidden text-xs text-slate-500 sm:block">Log Monitoring & Threat Detection System</p></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Monitoring active</div>
        </header>
        <div className="p-4 md:p-6"><Outlet /></div>
      </main>
    </div>
  );
}
