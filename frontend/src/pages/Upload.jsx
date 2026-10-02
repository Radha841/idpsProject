import { useRef, useState } from "react";
import { FileUp, UploadCloud } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { uploadLogs } from "../services/api";

export default function Upload() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function choose(f) { if (f) { setFile(f); setResult(null); } }
  async function submit() {
    if (!file) return;
    setLoading(true); setResult(null);
    try { setResult(await uploadLogs(file)); } finally { setLoading(false); }
  }

  return (
    <>
      <PageHeader title="Upload Logs" description="Upload SSH or web server log files for parsing and detection." />
      <div className={`card border-2 border-dashed p-10 text-center ${drag ? "border-slate-900 bg-slate-50" : "border-slate-300"}`}
        onDragOver={e => {e.preventDefault(); setDrag(true)}} onDragLeave={() => setDrag(false)}
        onDrop={e => {e.preventDefault(); setDrag(false); choose(e.dataTransfer.files[0])}}>
        <UploadCloud className="mx-auto text-slate-500" size={42}/>
        <h3 className="mt-4 text-lg font-semibold">Drag and drop a log file here</h3>
        <p className="mt-1 text-sm text-slate-500">or select a file from your computer</p>
        <input ref={inputRef} type="file" accept=".log,.txt,.json,.csv" className="hidden" onChange={e => choose(e.target.files[0])}/>
        <button className="btn-secondary mt-5" onClick={() => inputRef.current?.click()}><FileUp size={17}/> Choose file</button>
        {file && <div className="mx-auto mt-5 max-w-md rounded-lg bg-slate-100 p-3 text-sm">{file.name} · {(file.size / 1024).toFixed(1)} KB</div>}
        <button disabled={!file || loading} className="btn-primary mt-4" onClick={submit}>{loading ? "Uploading..." : "Upload & Analyze"}</button>
      </div>
      {result && <div className="card mt-5 p-5"><h3 className="font-semibold">Upload Summary</h3><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-slate-500">File</p><p className="font-medium">{result.filename}</p></div><div><p className="text-xs text-slate-500">Processed logs</p><p className="font-medium">{result.processed}</p></div><div><p className="text-xs text-slate-500">Alerts created</p><p className="font-medium">{result.alerts_created}</p></div></div></div>}
    </>
  );
}
