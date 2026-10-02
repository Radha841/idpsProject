"""FastAPI app: REST endpoints + live WebSocket alert stream + the honeytoken
decoy route (R009).

Run with:
    uvicorn backend.api.main:app --reload
"""
import asyncio
import json
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, File, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.api import db, store
from backend.pipeline import Pipeline

app = FastAPI(title="IDPS API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

conn = db.init_db()
store.set_connection(conn)
pipe = Pipeline(on_record=store.save_log, on_alert=store.save_alert_and_push,
                on_incident=store.save_incident)

_ws_clients: List[WebSocket] = []


async def _broadcast(alert):
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_json(alert)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


def _push_ws(alert):
    """store.save_alert_and_push calls this synchronously; schedule the actual
    async send on FastAPI's running event loop."""
    try:
        asyncio.get_event_loop().create_task(_broadcast(alert))
    except RuntimeError:
        pass  # no loop running yet (e.g. during a script/test import)


store.set_ws_push(_push_ws)


# ---------- logs ----------
@app.get("/api/logs")
def list_logs(ip: Optional[str] = None, source: Optional[str] = None,
              keyword: Optional[str] = None, limit: int = 200):
    q = "SELECT * FROM logs WHERE 1=1"
    params = []
    if ip:
        q += " AND ip = ?"; params.append(ip)
    if source:
        q += " AND source = ?"; params.append(source)
    if keyword:
        q += " AND raw_line LIKE ?"; params.append(f"%{keyword}%")
    q += " ORDER BY timestamp DESC LIMIT ?"; params.append(limit)
    return [dict(r) for r in conn.execute(q, params).fetchall()]


@app.post("/api/logs/upload")
async def upload_log(file: UploadFile = File(...), source: Optional[str] = None):
    content = (await file.read()).decode("utf-8", errors="replace")
    out = pipe.process_lines(content.splitlines(), source=source)
    return {"lines": len(content.splitlines()), "alerts_raised": sum(len(o["alerts"]) for o in out)}


# ---------- alerts ----------
@app.get("/api/alerts")
def list_alerts(severity: Optional[str] = None, status: Optional[str] = None, limit: int = 200):
    q = "SELECT * FROM alerts WHERE 1=1"
    params = []
    if severity:
        q += " AND severity = ?"; params.append(severity)
    if status:
        q += " AND status = ?"; params.append(status)
    q += " ORDER BY timestamp DESC LIMIT ?"; params.append(limit)
    return [dict(r) for r in conn.execute(q, params).fetchall()]


@app.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: str, status: str):
    conn.execute("UPDATE alerts SET status = ? WHERE id = ?", (status, alert_id))
    conn.commit()
    return {"id": alert_id, "status": status}


# ---------- incidents ----------
@app.get("/api/incidents")
def list_incidents():
    return [dict(r) for r in conn.execute("SELECT * FROM incidents ORDER BY start_time DESC").fetchall()]


@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str):
    row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    if not row:
        return {"error": "not found"}
    d = dict(row)
    d["linked_alert_ids"] = json.loads(d["linked_alert_ids"])
    d["timeline"] = json.loads(d["timeline"])
    return d


# ---------- stats ----------
@app.get("/api/stats")
def stats():
    c = lambda q: conn.execute(q).fetchone()["c"]
    by_rule = conn.execute("SELECT rule_name, COUNT(*) c FROM alerts GROUP BY rule_name").fetchall()
    return {
        "total_logs": c("SELECT COUNT(*) c FROM logs"),
        "total_alerts": c("SELECT COUNT(*) c FROM alerts"),
        "critical_alerts": c("SELECT COUNT(*) c FROM alerts WHERE severity='Critical'"),
        "blocked_ips": c("SELECT COUNT(*) c FROM blocked_ips WHERE unblocked_at IS NULL"),
        "honeytoken_hits": c("SELECT COUNT(*) c FROM honeytoken_hits"),
        "alerts_by_rule": {r["rule_name"]: r["c"] for r in by_rule},
    }


# ---------- rules ----------
@app.get("/api/rules")
def list_rules():
    with open(pipe.engine.rules_path) as f:
        return json.load(f)["rules"]


@app.post("/api/rules")
def add_rule(rule: dict):
    with open(pipe.engine.rules_path) as f:
        data = json.load(f)
    data["rules"].append(rule)
    with open(pipe.engine.rules_path, "w") as f:
        json.dump(data, f, indent=2)
    pipe.engine.load_rules()   # picks up the new rule immediately, no restart needed
    return rule


# ---------- blocked ips ----------
@app.get("/api/blocked-ips")
def list_blocked():
    rows = conn.execute("SELECT * FROM blocked_ips WHERE unblocked_at IS NULL").fetchall()
    return [dict(r) for r in rows]


@app.post("/api/blocked-ips")
def block_ip(ip: str, reason: str = "manual block"):
    conn.execute("INSERT OR IGNORE INTO blocked_ips (ip, reason, blocked_at) VALUES (?, ?, ?)",
                 (ip, reason, datetime.now().isoformat()))
    conn.commit()
    return {"ip": ip, "blocked": True}


@app.delete("/api/blocked-ips/{ip}")
def unblock_ip(ip: str):
    conn.execute("UPDATE blocked_ips SET unblocked_at = ? WHERE ip = ? AND unblocked_at IS NULL",
                 (datetime.now().isoformat(), ip))
    conn.commit()
    return {"ip": ip, "blocked": False}


# ---------- honeytoken decoy (R009) ----------
@app.api_route("/api/admin-secret-backup", methods=["GET", "POST"])
async def honeytoken(request: Request):
    """Fake endpoint with no real function. Any hit, from anyone, is a true positive.
    Logs to honeytoken_hits AND is replayed through the normal pipeline as a web_request
    so it triggers R009 in rules.json exactly like real traffic would."""
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    now = datetime.now()

    conn.execute(
        "INSERT INTO honeytoken_hits (timestamp, ip, resource_touched, user_agent) VALUES (?, ?, ?, ?)",
        (now.isoformat(), ip, "/api/admin-secret-backup", ua),
    )
    conn.commit()

    fake_line = (f'{ip} - - [{now:%d/%b/%Y:%H:%M:%S} +0000] '
                 f'"GET /api/admin-secret-backup HTTP/1.1" 200 0')
    pipe.process_line(fake_line, source="web")
    return {"status": "ok"}


# ---------- websocket ----------
@app.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()   # keep-alive; client has nothing to send
    except WebSocketDisconnect:
        _ws_clients.remove(websocket)
