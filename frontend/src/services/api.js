import { mockAlerts, mockBlockedIps, mockIncidents, mockLogs, mockRules, mockStats } from "../data/mock";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const WS_URL = import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, "ws");

let demoMode = false;

export const isDemoMode = () => demoMode;

async function request(path, options = {}) {
  const token = localStorage.getItem("idps_token");
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!response.ok) throw new Error(await response.text() || `HTTP ${response.status}`);
    demoMode = false;
    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    demoMode = true;
    console.warn(`Backend unavailable for ${path}; using demo data.`, error.message);
    return null;
  }
}

export async function login(username, password) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  if (data) return data;

  return {
    access_token: "demo-token",
    token_type: "bearer",
    user: { username: username || "analyst", role: "analyst" }
  };
}

export async function getStats() {
  return (await request("/api/stats")) || mockStats;
}
export async function getAlerts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return (await request(`/api/alerts${query ? `?${query}` : ""}`)) || mockAlerts;
}
export async function updateAlert(id, status) {
  const result = await request(`/api/alerts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  return result || { ...mockAlerts.find(a => a.id === id), status };
}
export async function getIncidents() {
  return (await request("/api/incidents")) || mockIncidents;
}
export async function getIncident(id) {
  const result = await request(`/api/incidents/${id}`);
  return result || {
    ...mockIncidents.find(i => String(i.id) === String(id)),
    timeline: mockAlerts.filter(a => mockIncidents.find(i => i.id === Number(id))?.linked_alert_ids?.includes(a.id))
  };
}
export async function getLogs(params = {}) {
  const query = new URLSearchParams(params).toString();
  return (await request(`/api/logs${query ? `?${query}` : ""}`)) || mockLogs;
}
export async function uploadLogs(file) {
  const form = new FormData();
  form.append("file", file);
  return (await request("/api/logs/upload", { method: "POST", body: form })) || {
    message: "Demo upload complete",
    filename: file.name,
    processed: 42,
    alerts_created: 3
  };
}
export async function getRules() {
  return (await request("/api/rules")) || mockRules;
}
export async function createRule(rule) {
  const result = await request("/api/rules", { method: "POST", body: JSON.stringify(rule) });
  return result || { id: Date.now(), ...rule };
}
export async function toggleRule(id, enabled) {
  const result = await request(`/api/rules/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
  return result || { id, enabled };
}
export async function getBlockedIps() {
  return (await request("/api/blocked-ips")) || mockBlockedIps;
}
export async function blockIp(ip, reason) {
  const result = await request("/api/blocked-ips", { method: "POST", body: JSON.stringify({ ip, reason }) });
  return result || { id: Date.now(), ip, reason, blocked_at: new Date().toISOString(), unblocked_at: null };
}
export async function unblockIp(id) {
  const result = await request(`/api/blocked-ips/${id}`, { method: "DELETE" });
  return result || null;
}

export function connectAlertSocket(onMessage, onStatus) {
  const token = localStorage.getItem("idps_token");
  const url = `${WS_URL}/ws/alerts${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  let socket;
  try {
    socket = new WebSocket(url);
    socket.onopen = () => onStatus?.("connected");
    socket.onclose = () => onStatus?.("disconnected");
    socket.onerror = () => onStatus?.("error");
    socket.onmessage = (event) => {
      try { onMessage(JSON.parse(event.data)); } catch { /* ignore malformed messages */ }
    };
  } catch {
    onStatus?.("error");
  }
  return () => socket?.close();
}
