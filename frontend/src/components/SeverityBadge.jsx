export default function SeverityBadge({ severity }) {
  const map = {
    Critical: "bg-red-100 text-red-700",
    High: "bg-orange-100 text-orange-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-blue-100 text-blue-700"
  };
  return <span className={`badge ${map[severity] || "bg-slate-100 text-slate-700"}`}>{severity || "Unknown"}</span>;
}
