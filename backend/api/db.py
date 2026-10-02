"""Database setup: SQLite schema for logs, alerts, incidents, blocked_ips, rules
and honeytoken_hits.

Field names match exactly what backend/parser, backend/detection and
backend/correlation already produce, so store.py can insert records straight
in with no reshaping.
"""
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "idps.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    source TEXT,
    ip TEXT,
    user TEXT,
    event_type TEXT,
    request TEXT,
    status_code INTEGER,
    raw_line TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    rule_id TEXT,
    rule_name TEXT,
    severity TEXT,
    timestamp TEXT,
    ip TEXT,
    user TEXT,
    description TEXT,
    evidence TEXT,
    action TEXT,
    status TEXT DEFAULT 'New'
);

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    title TEXT,
    ip TEXT,
    user TEXT,
    start_time TEXT,
    end_time TEXT,
    severity TEXT,
    status TEXT DEFAULT 'Open',
    alert_count INTEGER,
    linked_alert_ids TEXT,
    timeline TEXT
);

CREATE TABLE IF NOT EXISTS blocked_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT UNIQUE,
    reason TEXT,
    blocked_at TEXT,
    unblocked_at TEXT
);

CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    config TEXT,
    severity TEXT,
    enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS honeytoken_hits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    ip TEXT,
    resource_touched TEXT,
    user_agent TEXT
);
"""


def get_connection(db_path=DB_PATH):
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path=DB_PATH):
    """Create all tables if they don't exist yet. Safe to call on every startup."""
    conn = get_connection(db_path)
    conn.executescript(SCHEMA)
    conn.commit()
    return conn
