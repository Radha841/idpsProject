import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import SeverityBadge from "../components/SeverityBadge";
import { createRule, getRules, toggleRule } from "../services/api";

const empty = { name: "", type: "pattern", config: "", severity: "Medium", enabled: true };

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);
  useEffect(() => { getRules().then(setRules); }, []);

  async function add(e) {
    e.preventDefault();
    const created = await createRule(form);
    setRules(prev => [...prev, created]);
    setForm(empty); setShow(false);
  }
  async function toggle(rule) {
    const next = !rule.enabled;
    await toggleRule(rule.id, next);
    setRules(prev => prev.map(r => r.id === rule.id ? {...r, enabled: next} : r));
  }

  return (
    <>
      <PageHeader title="Detection Rules" description="View, enable/disable, and add signature or threshold rules." action={<button className="btn-primary" onClick={() => setShow(!show)}>{show ? "Cancel" : "Add Rule"}</button>} />
      {show && <form onSubmit={add} className="card mb-5 p-5"><div className="grid gap-4 md:grid-cols-2"><div><label className="label">Rule name</label><input className="input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} required/></div><div><label className="label">Type</label><select className="input" value={form.type} onChange={e => setForm({...form,type:e.target.value})}><option value="pattern">Pattern</option><option value="threshold">Threshold</option><option value="time">Time</option></select></div><div className="md:col-span-2"><label className="label">Config / trigger</label><input className="input" placeholder="Example: suspicious pattern or threshold expression" value={form.config} onChange={e => setForm({...form,config:e.target.value})} required/></div><div><label className="label">Severity</label><select className="input" value={form.severity} onChange={e => setForm({...form,severity:e.target.value})}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div></div><button className="btn-primary mt-4">Save Rule</button></form>}
      <div className="card overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Rule</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Trigger / Config</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Enabled</th></tr></thead><tbody className="divide-y divide-slate-100">{rules.map(r => <tr key={r.id}><td className="px-4 py-4 font-medium">{r.name}</td><td className="px-4 py-4">{r.type}</td><td className="px-4 py-4 text-slate-600">{r.config}</td><td className="px-4 py-4"><SeverityBadge severity={r.severity}/></td><td className="px-4 py-4"><button onClick={() => toggle(r)} className={`relative h-6 w-11 rounded-full transition ${r.enabled ? "bg-slate-900" : "bg-slate-300"}`} aria-label="Toggle rule"><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${r.enabled ? "left-6" : "left-1"}`}/></button></td></tr>)}</tbody></table></div>
    </>
  );
}
