"""Callback wiring: the three functions backend.pipeline.Pipeline calls directly.

    pipe = Pipeline(on_record=save_log, on_alert=save_alert_and_push, on_incident=save_incident)

Each function takes exactly the dict shape already produced by backend/parser,
backend/detection and backend/correlation, and writes it straight into the
matching table from db.py. No reshaping, no renamed fields.
"""
import json

from backend.api.response import apply_action

_conn = None
_push_ws = lambda alert: None   # replaced by main.py at startup


def set_connection(conn):
    """Call once at startup (main.py) so these functions share the app's connection."""
    global _conn
    _conn = conn


def set_ws_push(fn):
    """Call once at startup (main.py) so save_alert_and_push can broadcast live."""
    global _push_ws
    _push_ws = fn


def _db():
    if _conn is None:
        raise RuntimeError("store.set_connection(conn) must be called before saving")
    return _conn


def save_log(record):
    _db().execute(
        "INSERT INTO logs (timestamp, source, ip, user, event_type, request, status_code, raw_line) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (record["timestamp"], record["source"], record["ip"], record["user"],
         record["event_type"], record["request"], record["status_code"], record["raw_line"]),
    )
    _db().commit()


def save_alert_and_push(alert):
    _db().execute(
        "INSERT OR REPLACE INTO alerts "
        "(id, rule_id, rule_name, severity, timestamp, ip, user, description, evidence, action, status) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (alert["id"], alert["rule_id"], alert["rule_name"], alert["severity"], alert["timestamp"],
         alert["ip"], alert["user"], alert["description"], json.dumps(alert["evidence"]),
         alert["action"], alert["status"]),
    )
    _db().commit()
    apply_action(alert, _db())   # block_ip etc, see response.py
    _push_ws(alert)              # live push to the dashboard, see main.py


def save_incident(incident):
    _db().execute(
        "INSERT OR REPLACE INTO incidents "
        "(id, title, ip, user, start_time, end_time, severity, status, alert_count, linked_alert_ids, timeline) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (incident["id"], incident["title"], incident["ip"], incident["user"],
         incident["start_time"], incident["end_time"], incident["severity"], incident["status"],
         incident["alert_count"], json.dumps(incident["linked_alert_ids"]),
         json.dumps(incident["timeline"])),
    )
    _db().commit()
