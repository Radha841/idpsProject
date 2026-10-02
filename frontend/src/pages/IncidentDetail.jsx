import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, Clock3 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import SeverityBadge from "../components/SeverityBadge";
import { getIncident } from "../services/api";

export default function IncidentDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  useEffect(() => { getIncident(id).then(setIncident); }, [id]);

  if (!incident) return <div className="py-20 text-center text-slate-500">Loading incident...</div>;

  return (
    <>
      <div className="mb-4"><Link to="/incidents" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/> Back to incidents</Link></div>
      <PageHeader title={incident.title} description={`IP ${incident.ip} · User ${incident.user || "-"}`} />
      <div className="card p-5">
        <div className="mb-6 grid gap-4 sm:grid-cols-3"><div><p className="text-xs uppercase text-slate-400">Status</p><p className="mt-1 font-semibold">{incident.status}</p></div><div><p className="text-xs uppercase text-slate-400">Start</p><p className="mt-1 text-sm">{new Date(incident.start_time).toLocaleString()}</p></div><div><p className="text-xs uppercase text-slate-400">End</p><p className="mt-1 text-sm">{new Date(incident.end_time || incident.start_time).toLocaleString()}</p></div></div>
        <div className="relative ml-2 border-l-2 border-slate-200 pl-7">{(incident.timeline || []).map((event, index) => <div key={event.id || index} className="relative mb-7 last:mb-0"><span className="absolute -left-[37px] top-0 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-slate-900 text-white"><CircleAlert size={13}/></span><div className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={event.severity}/><span className="font-semibold">{event.rule_name}</span></div><p className="mt-2 text-sm text-slate-600">{event.description}</p><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400"><span className="flex items-center gap-1"><Clock3 size={13}/>{new Date(event.timestamp).toLocaleString()}</span><span>IP: {event.ip}</span><span>Status: {event.status}</span></div></div></div>)}</div>
      </div>
    </>
  );
}
