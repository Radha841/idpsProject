import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Search } from "lucide-react";
import PageHeader from "../components/PageHeader";
import SeverityBadge from "../components/SeverityBadge";
import { blockIp, getAlerts, updateAlert } from "../services/api";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  async function load() { setAlerts(await getAlerts()); }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => alerts.filter(a =>
    (!severity || a.severity === severity) &&
    (!status || a.status === status) &&
    (`${a.rule_name} ${a.ip} ${a.description}`.toLowerCase().includes(search.toLowerCase()))
  ), [alerts, severity, status, search]);

  async function mark(id, nextStatus) {
    const updated = await updateAlert(id, nextStatus);
    setAlerts(prev => prev.map(a => a.id === id ? {...a, status: updated.status || nextStatus} : a));
  }
  async function block(ip, reason) {
    await blockIp(ip, reason);
    alert(`Block request sent for ${ip}.`);
  }

  return (
    <>
      <PageHeader title="Alerts" description="Review detection alerts, change status, and block suspicious IP addresses." />
      <div className="card mb-5 p-4"><div className="grid gap-3 md:grid-cols-4"><div className="relative md:col-span-2"><Search className="absolute left-3 top-2.5 text-slate-400" size={17}/><input className="input pl-10" placeholder="Search rule, IP or description..." value={search} onChange={e => setSearch(e.target.value)}/></div><select className="input" value={severity} onChange={e => setSeverity(e.target.value)}><option value="">All severities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select><select className="input" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option>New</option><option>Reviewed</option><option>Closed</option></select></div></div>
      <div className="card overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Rule</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">IP</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(a => <tr key={a.id} className="hover:bg-slate-50"><td className="px-4 py-3 whitespace-nowrap text-slate-500">{new Date(a.timestamp).toLocaleString()}</td><td className="px-4 py-3 font-medium">{a.rule_name}</td><td className="px-4 py-3"><SeverityBadge severity={a.severity}/></td><td className="px-4 py-3 font-mono text-xs">{a.ip}</td><td className="max-w-sm px-4 py-3 text-slate-600">{a.description}</td><td className="px-4 py-3">{a.status}</td><td className="px-4 py-3"><div className="flex gap-2">{a.status !== "Reviewed" && <button className="btn-secondary" onClick={() => mark(a.id, "Reviewed")}><CheckCircle2 size={15}/>Review</button>}{a.status !== "Closed" && <button className="btn-danger" onClick={() => mark(a.id, "Closed")}>Close</button>}<button className="btn-secondary" onClick={() => block(a.ip, a.rule_name)}><Ban size={15}/>Block</button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No alerts match the filters.</div>}</div>
    </>
  );
}
