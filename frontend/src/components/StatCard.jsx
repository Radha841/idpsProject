export default function StatCard({ icon: Icon, label, value, note }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div>
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon size={20}/></div>
      </div>
      {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
