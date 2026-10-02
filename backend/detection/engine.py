"""Detection engine: runs every enabled rule from rules.json against each record.

Rule types (the "type" field in rules.json):
    pattern    - regex match on a record field (SQLi, XSS, traversal)
    threshold  - N events from the same key inside a sliding time window
    privilege  - sudo/su by a user who is not in admin_users
    off_hours  - login outside start_hour..end_hour
    sequence   - an event that follows another rule's alert (login after brute force)

To add a new TYPE: write a method named _check_<type>(self, rule, record, dt) that
returns None or {"key": ..., "description": ..., "evidence": [...]}.
To add a new RULE of an existing type: just edit rules.json - no code change.

IMPORTANT: all time logic uses the timestamp inside the log, not the wall clock,
so replaying an old log file behaves exactly like live traffic.
"""
import json
import os
import re
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta
from urllib.parse import unquote_plus

SEVERITY_ORDER = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
DEFAULT_RULES = os.path.join(os.path.dirname(__file__), "..", "config", "rules.json")


def to_dt(ts):
    return ts if isinstance(ts, datetime) else datetime.fromisoformat(ts)


class DetectionEngine:
    def __init__(self, rules_path=DEFAULT_RULES, rules=None):
        self.rules_path = rules_path
        self.rules = []
        self._compiled = {}
        self._windows = defaultdict(deque)   # (rule_id, key) -> deque[(dt, raw_line)]
        self._last_alert = {}                # (rule_id, key) -> dt of last alert (cooldown / dedup)
        self._fired = {}                     # (rule_id, key) -> dt a rule last matched (for sequences)
        self.load_rules(rules)

    # ---------- rules ----------
    def load_rules(self, rules=None):
        """(Re)load rules. Call again after the Rules page changes rules.json or the DB."""
        if rules is None:
            with open(self.rules_path, "r", encoding="utf-8") as f:
                rules = json.load(f)["rules"]
        self.rules = [r for r in rules if r.get("enabled", True)]
        self._compiled = {
            r["id"]: [re.compile(p, re.IGNORECASE) for p in r.get("patterns", [])]
            for r in self.rules
        }

    # ---------- main entry ----------
    def evaluate(self, record):
        """Return a list of new alerts (usually empty) for one parsed record."""
        dt = to_dt(record["timestamp"])
        alerts = []
        for rule in self.rules:
            check = getattr(self, f"_check_{rule['type']}", None)
            if check is None:
                continue
            hit = check(rule, record, dt)
            if not hit:
                continue
            key = (rule["id"], hit["key"])
            self._fired[key] = dt
            last = self._last_alert.get(key)
            if last and (dt - last).total_seconds() < rule.get("cooldown_seconds", 60):
                continue  # dedup: same rule + same attacker, still in cooldown
            self._last_alert[key] = dt
            alerts.append(self._make_alert(rule, record, hit))
        return alerts

    # ---------- helpers ----------
    @staticmethod
    def _event_matches(rule, record):
        wanted = rule.get("event_type")
        if wanted is None:
            return True
        wanted = [wanted] if isinstance(wanted, str) else wanted
        return record["event_type"] in wanted

    @staticmethod
    def _make_alert(rule, record, hit):
        return {
            "id": uuid.uuid4().hex[:8],
            "rule_id": rule["id"],
            "rule_name": rule["name"],
            "severity": rule["severity"],
            "timestamp": record["timestamp"],
            "ip": record.get("ip"),
            "user": record.get("user"),
            "description": hit["description"],
            "evidence": hit["evidence"],
            "action": rule.get("action", "none"),
            "status": "New",
        }

    # ---------- rule types ----------
    def _check_pattern(self, rule, record, dt):
        if not self._event_matches(rule, record):
            return None
        text = record.get(rule.get("field", "request"))
        if not text:
            return None
        decoded = unquote_plus(unquote_plus(text))   # defeats %27 / double-encoding tricks
        for rx in self._compiled[rule["id"]]:
            m = rx.search(decoded)
            if m:
                return {"key": record.get("ip") or "unknown",
                        "description": f"{rule['name']}: matched '{m.group(0)}' in request {decoded[:120]}",
                        "evidence": [record["raw_line"]]}
        return None

    def _check_threshold(self, rule, record, dt):
        if not self._event_matches(rule, record):
            return None
        group = record.get(rule.get("group_by", "ip"))
        if not group:
            return None
        window = self._windows[(rule["id"], group)]
        window.append((dt, record["raw_line"]))
        cutoff = dt - timedelta(seconds=rule["window_seconds"])
        while window and window[0][0] < cutoff:
            window.popleft()
        if len(window) >= rule["count"]:
            return {"key": group,
                    "description": f"{len(window)} '{rule['event_type']}' events from {group} "
                                   f"within {rule['window_seconds']} seconds",
                    "evidence": [line for _, line in list(window)[-10:]]}
        return None

    def _check_privilege(self, rule, record, dt):
        if not self._event_matches(rule, record):
            return None
        user = record.get("user")
        if not user or user in rule.get("admin_users", []):
            return None
        return {"key": user,
                "description": f"Non-admin user '{user}' ran: {record.get('request')}",
                "evidence": [record["raw_line"]]}

    def _check_off_hours(self, rule, record, dt):
        if not self._event_matches(rule, record):
            return None
        if rule["start_hour"] <= dt.hour < rule["end_hour"]:
            return None
        who = record.get("user") or record.get("ip") or "unknown"
        return {"key": who,
                "description": f"Login by '{who}' at {dt:%H:%M}, outside "
                               f"{rule['start_hour']:02d}:00-{rule['end_hour']:02d}:00",
                "evidence": [record["raw_line"]]}

    def _check_sequence(self, rule, record, dt):
        if not self._event_matches(rule, record):
            return None
        ip = record.get("ip")
        if not ip:
            return None
        earlier = self._fired.get((rule["after_rule"], ip))
        if earlier and 0 <= (dt - earlier).total_seconds() <= rule["within_seconds"]:
            return {"key": ip,
                    "description": f"Successful login by '{record.get('user')}' from {ip} shortly after "
                                   f"alert {rule['after_rule']} - the attacker may have guessed the password",
                    "evidence": [record["raw_line"]]}
        return None
