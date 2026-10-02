export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-bold">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
      {action}
    </div>
  );
}
