"""Correlation engine: groups alerts that share an IP or a user inside a time window
into one incident with an ordered timeline.

Example: brute force (ip 10.0.0.5, user deploy) -> login after brute force (same ip)
-> privilege escalation (user deploy) becomes ONE incident with 3 timeline entries.
"""
import uuid

from backend.detection.engine import SEVERITY_ORDER, to_dt


class Incident:
    def __init__(self, alert):
        self.id = "INC-" + uuid.uuid4().hex[:6].upper()
        self.ips = set()
        self.users = set()
        self.alerts = []
        self.status = "Open"
        self.add(alert)

    def add(self, alert):
        self.alerts.append(alert)
        self.alerts.sort(key=lambda a: a["timestamp"])
        if alert.get("ip"):
            self.ips.add(alert["ip"])
        if alert.get("user"):
            self.users.add(alert["user"])

    @property
    def start_time(self):
        return self.alerts[0]["timestamp"]

    @property
    def end_time(self):
        return self.alerts[-1]["timestamp"]

    @property
    def severity(self):
        return max((a["severity"] for a in self.alerts), key=lambda s: SEVERITY_ORDER[s])

    @property
    def title(self):
        names = []
        for a in self.alerts:
            if not names or names[-1] != a["rule_name"]:
                names.append(a["rule_name"])
        who = ", ".join(sorted(self.ips)) or ", ".join(sorted(self.users)) or "unknown"
        return f"{who}: " + " -> ".join(names)

    def to_dict(self):
        """Shape stored in the incidents table and returned by /api/incidents."""
        return {
            "id": self.id,
            "title": self.title,
            "ip": ", ".join(sorted(self.ips)) or None,
            "user": ", ".join(sorted(self.users)) or None,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "severity": self.severity,
            "status": self.status,
            "alert_count": len(self.alerts),
            "linked_alert_ids": [a["id"] for a in self.alerts],
            "timeline": self.alerts,
        }


class Correlator:
    def __init__(self, window_seconds=600):
        self.window_seconds = window_seconds
        self.incidents = []   # all incidents, oldest first

    def process(self, alert):
        """Attach the alert to a matching open incident, or start a new one. Returns the Incident."""
        at = to_dt(alert["timestamp"])
        for inc in reversed(self.incidents):
            if inc.status != "Open":
                continue
            gap = (at - to_dt(inc.end_time)).total_seconds()
            if gap > self.window_seconds:
                continue
            same_ip = alert.get("ip") and alert["ip"] in inc.ips
            same_user = alert.get("user") and alert["user"] in inc.users
            if same_ip or same_user:
                inc.add(alert)
                return inc
        inc = Incident(alert)
        self.incidents.append(inc)
        return inc

    def correlated(self):
        """Only incidents that really merged 2+ alerts (what the Incident Timeline page shows)."""
        return [i for i in self.incidents if len(i.alerts) >= 2]
