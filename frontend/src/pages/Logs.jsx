import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { getLogs } from "../services/api";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  useEffect(() => { getLogs().then(setLogs); }, []);

  const filtered = useMemo(() => logs.filter(l => (!source || l.source === source) && JSON.stringify(l).toLowerCase().includes(query.toLowerCase())), [logs, query, source]);

  return (
    <>
      <PageHeader title="Log Explorer" description="Search and inspect normalized log records received by the system." />
      <div className="card mb-5 p-4"><div className="grid gap-3 md:grid-cols-3"><div className="relative md:col-span-2"><Search className="absolute left-3 top-2.5 text-slate-400" size={17}/><input className="input pl-10" placeholder="Search IP, user, event or raw log..." value={query} onChange={e => setQuery(e.target.value)}/></div><select className="input" value={source} onChange={e => setSource(e.target.value)}><option value="">All sources</option><option value="auth.log">auth.log</option><option value="access.log">access.log</option><option value="nginx">nginx</option></select></div></div>
      <div className="card overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">IP</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Request</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Raw line</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(l => <tr key={l.id}><td className="px-4 py-3 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td><td className="px-4 py-3">{l.source}</td><td className="px-4 py-3 font-mono text-xs">{l.ip}</td><td className="px-4 py-3">{l.user}</td><td className="px-4 py-3">{l.event_type}</td><td className="max-w-xs truncate px-4 py-3">{l.request}</td><td className="px-4 py-3">{l.status_code}</td><td className="max-w-md truncate px-4 py-3 font-mono text-xs text-slate-500">{l.raw_line}</td></tr>)}</tbody></table></div>
    </>
  );
}
