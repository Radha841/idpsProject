"""Turn one raw log line into the shared record.

Every record has exactly these fields:
    timestamp, source, ip, user, event_type, request, status_code, raw_line

- timestamp : ISO string, naive local wall-clock time (timezone dropped on purpose
              so SSH and web logs can be compared with each other)
- source    : "ssh" or "web"
- event_type: failed_login | successful_login | invalid_user | sudo_command |
              su_attempt | web_request
"""
import re
from datetime import datetime

SCHEMA_FIELDS = ["timestamp", "source", "ip", "user", "event_type",
                 "request", "status_code", "raw_line"]

# ---------- SSH / auth.log (syslog format) ----------
SYSLOG_RE = re.compile(
    r"^(?P<mon>[A-Z][a-z]{2})\s+(?P<day>\d{1,2})\s+(?P<time>\d{2}:\d{2}:\d{2})\s+"
    r"(?P<host>\S+)\s+(?P<proc>[\w./-]+?)(?:\[(?P<pid>\d+)\])?:\s+(?P<msg>.*)$"
)
SSH_FAILED = re.compile(
    r"Failed password for (?:invalid user )?(?P<user>\S+) from (?P<ip>[0-9a-fA-F.:]+) port \d+")
SSH_ACCEPTED = re.compile(
    r"Accepted (?:password|publickey|keyboard-interactive/pam) for (?P<user>\S+) "
    r"from (?P<ip>[0-9a-fA-F.:]+) port \d+")
SSH_INVALID = re.compile(r"Invalid user (?P<user>\S+) from (?P<ip>[0-9a-fA-F.:]+)")
SUDO_RE = re.compile(r"^\s*(?P<user>\S+)\s+:\s+.*COMMAND=(?P<cmd>.*)$")
SU_RE = re.compile(r"(?P<result>Successful|FAILED) su for (?P<target>\S+) by (?P<user>\S+)")

# ---------- Apache / Nginx combined access log ----------
WEB_RE = re.compile(
    r'^(?P<ip>\S+) \S+ (?P<user>\S+) \[(?P<ts>[^\]]+)\] '
    r'"(?P<method>[A-Z]+) (?P<path>.*?) (?P<proto>HTTP/[\d.]+)" '
    r'(?P<status>\d{3}) (?P<size>\S+)'
)


def _record(timestamp, source, ip, user, event_type, request, status, raw):
    return {
        "timestamp": timestamp.isoformat(),
        "source": source,
        "ip": ip,
        "user": user,
        "event_type": event_type,
        "request": request,
        "status_code": status,
        "raw_line": raw,
    }


def parse_ssh(line, year=None):
    m = SYSLOG_RE.match(line)
    if not m:
        return None
    year = year or datetime.now().year
    try:
        ts = datetime.strptime(f"{year} {m['mon']} {m['day']} {m['time']}", "%Y %b %d %H:%M:%S")
    except ValueError:
        return None
    proc, msg = m["proc"], m["msg"]

    if proc == "sshd":
        for rx, event in ((SSH_FAILED, "failed_login"),
                          (SSH_ACCEPTED, "successful_login"),
                          (SSH_INVALID, "invalid_user")):
            hit = rx.search(msg)
            if hit:
                return _record(ts, "ssh", hit["ip"], hit["user"], event, None, None, line)
    elif proc == "sudo":
        hit = SUDO_RE.match(msg)
        if hit:
            return _record(ts, "ssh", None, hit["user"], "sudo_command", hit["cmd"].strip(), None, line)
    elif proc == "su":
        hit = SU_RE.search(msg)
        if hit:
            return _record(ts, "ssh", None, hit["user"], "su_attempt",
                           f"su to {hit['target']} ({hit['result'].lower()})", None, line)
    return None  # CRON, systemd and other noise is ignored


def parse_web(line, year=None):
    m = WEB_RE.match(line)
    if not m:
        return None
    try:
        ts = datetime.strptime(m["ts"], "%d/%b/%Y:%H:%M:%S %z").replace(tzinfo=None)
    except ValueError:
        return None
    user = None if m["user"] == "-" else m["user"]
    return _record(ts, "web", m["ip"], user, "web_request",
                   f"{m['method']} {m['path']}", int(m["status"]), line)


def parse_line(line, source=None, year=None):
    """Parse one line. source = "ssh" | "web" | None (auto-detect). Returns a dict or None."""
    line = line.rstrip("\r\n")
    if not line.strip():
        return None
    if source == "ssh":
        return parse_ssh(line, year)
    if source == "web":
        return parse_web(line, year)
    return parse_ssh(line, year) or parse_web(line, year)
