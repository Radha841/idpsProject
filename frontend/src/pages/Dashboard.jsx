import { useEffect, useState } from "react";
import { Activity, Bell, Blocks, ShieldAlert, Wifi } from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import SeverityBadge from "../components/SeverityBadge";
import { connectAlertSocket, getAlerts, getStats } from "../services/api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [socketStatus, setSocketStatus] = useState("disconnected");

  async function load() { setStats(await getStats()); setAlerts(await getAlerts()); }
  useEffect(() => {
    load();
    const close = connectAlertSocket((incoming) => {
      setAlerts(prev => [{...incoming, id: incoming.id || Date.now()}, ...prev].slice(0, 8));
    }, setSocketStatus);
    return close;
  }, []);

  if (!stats) return <div className="py-20 text-center text-slate-500">Loading dashboard...</div>;

  return (
    <>
      <PageHeader title="Dashboard" description="Live overview of logs, alerts and correlated incidents." />
      <div className="mb-5 flex items-center gap-2 text-xs text-slate-500"><Wifi size={15}/>{socketStatus === "connected" ? "WebSocket connected — live alerts enabled" : "WebSocket not connected — refresh or start FastAPI for live alerts"}</div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Activity} label="Total Logs" value={stats.total_logs?.toLocaleString()} note="Normalized log records" />
        <StatCard icon={Bell} label="Total Alerts" value={stats.total_alerts} note="Detected by enabled rules" />
        <StatCard icon={ShieldAlert} label="Active Incidents" value={stats.active_incidents} note="Correlated alert groups" />
        <StatCard icon={Blocks} label="Blocked IPs" value={stats.blocked_ips} note="Current response blocklist" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2"><h3 className="font-semibold">Alerts Over Time</h3><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.alerts_over_time}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="alerts" fillOpacity={0.15} strokeWidth={2}/></AreaChart></ResponsiveContainer></div></div>
        <div className="card p-5"><h3 className="font-semibold">Attack Types</h3><div className="mt-4 h-72"><ResponsiveContainer><PieChart><Pie data={stats.attack_types} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={92} label>{stats.attack_types.map((_, i) => <Cell key={i}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5"><h3 className="mb-4 font-semibold">Top Attacker IPs</h3><div className="h-64"><ResponsiveContainer><BarChart data={stats.top_ips} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis dataKey="ip" type="category" width={110}/><Tooltip/><Bar dataKey="count" barSize={20}/></BarChart></ResponsiveContainer></div></div>
        <div className="card overflow-hidden"><div className="border-b border-slate-200 p-5"><h3 className="font-semibold">Live Alert Ticker</h3></div><div className="divide-y divide-slate-100">{alerts.slice(0, 6).map(a => <div key={a.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><div className="truncate text-sm font-medium">{a.rule_name}</div><div className="truncate text-xs text-slate-500">{a.ip} · {new Date(a.timestamp).toLocaleTimeString()}</div></div><SeverityBadge severity={a.severity}/></div>)}</div></div>
      </div>
    </>
  );
}
