"""Response/action module: the "P" in IDPS. Looks at an alert's `action` field
(set per-rule in rules.json, see R001/R004/R006/R007/R009) and acts on it.

To add a new action: write a method named _do_<action>(alert, conn), the same
pattern DetectionEngine uses for _check_<type> in backend/detection/engine.py.
"""
from datetime import datetime


def apply_action(alert, conn):
    action = alert.get("action", "none")
    handler = globals().get(f"_do_{action}")
    if handler:
        handler(alert, conn)


def _do_block_ip(alert, conn):
    ip = alert.get("ip")
    if not ip:
        return
    conn.execute(
        "INSERT OR IGNORE INTO blocked_ips (ip, reason, blocked_at) VALUES (?, ?, ?)",
        (ip, f"{alert['rule_id']} {alert['rule_name']}", datetime.now().isoformat()),
    )
    conn.commit()


def _do_none(alert, conn):
    pass
