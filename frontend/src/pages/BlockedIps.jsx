import { useEffect, useState } from "react";
import { Ban, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { blockIp, getBlockedIps, unblockIp } from "../services/api";

export default function BlockedIps() {
  const [items, setItems] = useState([]);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => { getBlockedIps().then(setItems); }, []);

  async function add(e) {
    e.preventDefault();
    if (!ip) return;
    const item = await blockIp(ip, reason || "Manual block");
    setItems(prev => [...prev, item]);
    setIp(""); setReason("");
  }
  async function remove(id) {
    await unblockIp(id);
    setItems(prev => prev.filter(x => x.id !== id));
  }

  return (
    <>
      <PageHeader title="Blocked IPs" description="Manage IP addresses blocked as an IPS response action." />
      <form onSubmit={add} className="card mb-5 p-5"><div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"><input className="input" placeholder="IP address" value={ip} onChange={e => setIp(e.target.value)} required/><input className="input" placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)}/><button className="btn-danger"><Ban size={16}/> Block IP</button></div></form>
      <div className="card overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">IP Address</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Blocked At</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(x => <tr key={x.id}><td className="px-4 py-4 font-mono">{x.ip}</td><td className="px-4 py-4">{x.reason}</td><td className="px-4 py-4 text-slate-500">{new Date(x.blocked_at).toLocaleString()}</td><td className="px-4 py-4"><button className="btn-secondary" onClick={() => remove(x.id)}><Trash2 size={15}/> Unblock</button></td></tr>)}</tbody></table>{!items.length && <div className="p-10 text-center text-slate-500">No blocked IPs.</div>}</div>
    </>
  );
}
