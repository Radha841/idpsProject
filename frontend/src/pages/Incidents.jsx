import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Siren } from "lucide-react";
import PageHeader from "../components/PageHeader";
import SeverityBadge from "../components/SeverityBadge";
import { getIncidents } from "../services/api";

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  useEffect(() => { getIncidents().then(setIncidents); }, []);

  return (
    <>
      <PageHeader title="Incident Timeline" description="Correlated alerts grouped by IP/user and time window." />
      <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"><b>Correlation:</b> related alerts within the configured time window are represented as one incident instead of separate disconnected events.</div>
      <div className="grid gap-4">{incidents.map(i => <Link to={`/incidents/${i.id}`} key={i.id} className="card block p-5 hover:border-slate-400"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex gap-4"><div className="rounded-xl bg-slate-100 p-3"><Siren size={22}/></div><div><h3 className="font-semibold">{i.title}</h3><p className="mt-1 text-sm text-slate-500">IP: <span className="font-mono">{i.ip}</span> · User: {i.user || "-"}</p><p className="mt-1 text-xs text-slate-400">{new Date(i.start_time).toLocaleString()} → {new Date(i.end_time || i.start_time).toLocaleString()}</p></div></div><div className="flex items-center gap-3"><span className="badge bg-slate-100 text-slate-700">{i.linked_alert_ids?.length || 0} linked alerts</span><span className="badge bg-yellow-100 text-yellow-700">{i.status}</span><ChevronRight size={18} className="text-slate-400"/></div></div></Link>)}</div>
    </>
  );
}
