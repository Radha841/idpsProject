"""Run from the project root:  python -m pytest -v"""
from datetime import datetime, timedelta

from backend.correlation import Correlator
from backend.detection import DetectionEngine
from backend.parser import parse_line
from backend.pipeline import Pipeline

YEAR = 2026


def ssh_fail(sec, ip="10.0.0.5", user="deploy"):
    t = datetime(YEAR, 9, 29, 10, 32, 0) + timedelta(seconds=sec)
    return f"{t:%b %d %H:%M:%S} server sshd[1]: Failed password for {user} from {ip} port 4000 ssh2"


def web(ip, path, sec=0, hour=10):
    t = datetime(YEAR, 9, 29, hour, 0, 0) + timedelta(seconds=sec)
    return f'{ip} - - [{t:%d/%b/%Y:%H:%M:%S} +0530] "GET {path} HTTP/1.1" 200 512 "-" "curl/7"'


# ---------- parser ----------
def test_parse_ssh_failed():
    r = parse_line(ssh_fail(0), year=YEAR)
    assert (r["event_type"], r["ip"], r["user"]) == ("failed_login", "10.0.0.5", "deploy")
    assert r["timestamp"] == "2026-09-29T10:32:00"


def test_parse_invalid_user_variant():
    line = "Sep 29 10:32:11 server sshd[1]: Failed password for invalid user bob from 1.2.3.4 port 22 ssh2"
    assert parse_line(line, year=YEAR)["user"] == "bob"


def test_parse_web_with_spaces_in_url():
    r = parse_line(web("10.0.0.9", "/p?id=1' OR '1'='1"), year=YEAR)
    assert r["event_type"] == "web_request" and r["request"] == "GET /p?id=1' OR '1'='1"
    assert r["status_code"] == 200 and r["user"] is None


def test_garbage_and_noise_return_none():
    assert parse_line("this is not a log line") is None
    assert parse_line("Sep 29 10:31:00 server CRON[9]: session opened", year=YEAR) is None
    assert parse_line("") is None


# ---------- detection ----------
def run(lines):
    pipe = Pipeline(year=YEAR)
    alerts = []
    for line in lines:
        out = pipe.process_line(line)
        if out:
            alerts += out["alerts"]
    return alerts


def test_brute_force_needs_five_in_sixty_seconds():
    assert run([ssh_fail(i) for i in range(4)]) == []
    alerts = run([ssh_fail(i) for i in range(5)])
    assert [a["rule_id"] for a in alerts] == ["R001"]


def test_slow_failures_do_not_trigger():
    assert run([ssh_fail(i * 30) for i in range(10)]) == []   # one failure every 30s


def test_cooldown_dedups_repeated_alert():
    alerts = run([ssh_fail(i) for i in range(20)])
    assert len([a for a in alerts if a["rule_id"] == "R001"]) == 1


def test_sqli_plain_and_url_encoded():
    assert run([web("10.0.0.9", "/p?id=1' OR '1'='1")])[0]["rule_id"] == "R004"
    assert run([web("10.0.0.9", "/p?id=1%27%20OR%20%271%27=%271")])[0]["rule_id"] == "R004"
    assert run([web("10.0.0.9", "/p?id=1+UNION+SELECT+password+FROM+users")])[0]["rule_id"] == "R004"


def test_xss_and_traversal():
    assert run([web("10.0.0.9", "/s?q=<script>alert(1)</script>")])[0]["rule_id"] == "R005"
    assert run([web("10.0.0.9", "/../../etc/passwd")])[0]["rule_id"] == "R006"


def test_flood_100_in_10_seconds():
    lines = [web("10.0.0.7", "/index.html", sec=i // 15) for i in range(150)]  # 150 reqs in 10s
    assert "R007" in [a["rule_id"] for a in run(lines)]
    slow = [web("10.0.0.7", "/index.html", sec=i) for i in range(150)]         # 1 per second
    assert run(slow) == []


def test_off_hours_login():
    line = "Sep 29 02:14:00 server sshd[1]: Accepted password for alice from 1.2.3.4 port 22 ssh2"
    assert run([line])[0]["rule_id"] == "R003"
    ok = "Sep 29 11:14:00 server sshd[1]: Accepted password for alice from 1.2.3.4 port 22 ssh2"
    assert run([ok]) == []


def test_privilege_escalation_ignores_admin():
    bad = "Sep 29 10:35:00 server sudo:   deploy : TTY=pts/0 ; USER=root ; COMMAND=/bin/bash"
    good = "Sep 29 10:35:00 server sudo:   root : TTY=pts/0 ; USER=root ; COMMAND=/bin/ls"
    assert run([bad])[0]["rule_id"] == "R002"
    assert run([good]) == []


def test_normal_traffic_has_no_alerts():
    lines = [web(f"192.168.1.{i % 20}", f"/page{i}.html", sec=i * 2) for i in range(500)]
    assert run(lines) == []


def test_disabled_rule_is_skipped():
    engine = DetectionEngine(rules=[{"id": "X", "name": "x", "type": "pattern", "enabled": False,
                                     "patterns": ["a"], "severity": "Low"}])
    assert engine.rules == []


# ---------- correlation ----------
def test_attack_chain_becomes_one_incident():
    pipe = Pipeline(year=YEAR)
    pipe.process_file("sample_logs/attack_auth.log")
    assert pipe.stats["alerts"] == 3
    incs = pipe.correlator.correlated()
    assert len(incs) == 1
    d = incs[0].to_dict()
    assert d["alert_count"] == 3 and d["severity"] == "Critical"
    assert [a["rule_id"] for a in d["timeline"]] == ["R001", "R008", "R002"]


def alert(ts, ip=None, user=None, rid="R004"):
    return {"id": ts, "rule_id": rid, "rule_name": "n", "severity": "High",
            "timestamp": ts, "ip": ip, "user": user}


def test_different_ips_stay_separate():
    c = Correlator(600)
    c.process(alert("2026-09-29T10:00:00", ip="1.1.1.1"))
    c.process(alert("2026-09-29T10:01:00", ip="2.2.2.2"))
    assert len(c.incidents) == 2


def test_outside_window_starts_new_incident():
    c = Correlator(600)
    c.process(alert("2026-09-29T10:00:00", ip="1.1.1.1"))
    c.process(alert("2026-09-29T10:30:00", ip="1.1.1.1"))   # 30 min later
    assert len(c.incidents) == 2


def test_shared_user_links_ip_less_alert():
    c = Correlator(600)
    c.process(alert("2026-09-29T10:00:00", ip="1.1.1.1", user="deploy"))
    c.process(alert("2026-09-29T10:02:00", ip=None, user="deploy"))
    assert len(c.incidents) == 1
