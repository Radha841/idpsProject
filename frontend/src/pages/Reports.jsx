import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { getAlerts, getIncidents } from "../services/api";

function csv(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  return [keys.join(","), ...rows.map(row => keys.map(k => JSON.stringify(row[k] ?? "")).join(","))].join("\n");
}
function download(name, content, type) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export default function Reports() {
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => { getAlerts().then(setAlerts); getIncidents().then(setIncidents); }, []);

  function within(date) {
    const d = new Date(date).getTime();
    if (from && d < new Date(from).getTime()) return false;
    if (to && d > new Date(`${to}T23:59:59`).getTime()) return false;
    return true;
  }
  const filteredAlerts = alerts.filter(a => within(a.timestamp));
  const filteredIncidents = incidents.filter(i => within(i.start_time));

  return (
    <>
      <PageHeader title="Reports" description="Filter evidence and export alerts or incidents as CSV." />
      <div className="card mb-5 p-5"><div className="grid gap-3 md:grid-cols-4"><div><label className="label">From</label><input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)}/></div><div><label className="label">To</label><input type="date" className="input" value={to} onChange={e => setTo(e.target.value)}/></div><div className="flex items-end"><button className="btn-primary w-full" onClick={() => download("idps-alerts.csv", csv(filteredAlerts), "text/csv")}>Export Alerts CSV</button></div><div className="flex items-end"><button className="btn-secondary w-full" onClick={() => download("idps-incidents.csv", csv(filteredIncidents), "text/csv")}>Export Incidents CSV</button></div></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="card p-5"><p className="text-sm text-slate-500">Filtered alerts</p><p className="mt-2 text-3xl font-bold">{filteredAlerts.length}</p></div><div className="card p-5"><p className="text-sm text-slate-500">Filtered incidents</p><p className="mt-2 text-3xl font-bold">{filteredIncidents.length}</p></div></div>
      <p className="mt-5 text-xs text-slate-400">PDF export can be connected to a backend report endpoint later; the project guide specifies PDF/CSV reporting.</p>
    </>
  );
}
