import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield, LockKeyhole } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("analyst");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try { await login(username, password); navigate("/dashboard"); }
    catch { setError("Login failed. Check the backend and credentials."); }
    finally { setLoading(false); }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white"><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-950"><Shield size={30}/></div><h1 className="text-2xl font-bold">IDPS Monitor</h1><p className="mt-1 text-sm text-slate-400">Log Monitoring & Threat Detection System</p></div>
        <form onSubmit={submit} className="card p-6">
          <div className="mb-5"><h2 className="text-xl font-bold">Sign in</h2><p className="mt-1 text-sm text-slate-500">Use your analyst or admin account.</p></div>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <label className="label">Username</label><input className="input mb-4" value={username} onChange={e => setUsername(e.target.value)} required />
          <label className="label">Password</label><div className="relative mb-5"><LockKeyhole className="absolute left-3 top-2.5 text-slate-400" size={17}/><input type="password" className="input pl-10" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <button disabled={loading} className="btn-primary w-full">{loading ? "Signing in..." : "Sign in"}</button>
          <p className="mt-4 text-center text-xs text-slate-400">Frontend demo falls back to sample data when FastAPI is offline.</p>
        </form>
      </div>
    </div>
  );
}
