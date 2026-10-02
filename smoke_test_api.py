"""One-off smoke test, not part of the pytest suite. Run manually:
    python3 smoke_test_api.py
"""
from fastapi.testclient import TestClient

from backend.api.main import app

client = TestClient(app)

print("=== uploading attack_auth.log ===")
with open("sample_logs/attack_auth.log", "rb") as f:
    r = client.post("/api/logs/upload", files={"file": ("attack_auth.log", f, "text/plain")},
                     data={"source": "ssh"})
print(r.status_code, r.json())

print("\n=== /api/alerts ===")
r = client.get("/api/alerts")
print(r.status_code, len(r.json()), "alerts")
for a in r.json():
    print(" ", a["rule_id"], a["severity"], a["ip"], a["status"])

print("\n=== /api/incidents ===")
r = client.get("/api/incidents")
print(r.status_code, len(r.json()), "incidents")
for inc in r.json():
    print(" ", inc["id"], inc["severity"], inc["title"], "alert_count=", inc["alert_count"])

print("\n=== /api/blocked-ips (should include the brute-forced IP) ===")
r = client.get("/api/blocked-ips")
print(r.status_code, r.json())

print("\n=== hitting the honeytoken decoy ===")
r = client.get("/api/admin-secret-backup")
print(r.status_code, r.json())

print("\n=== /api/alerts again (should now include R009 Critical) ===")
r = client.get("/api/alerts", params={"severity": "Critical"})
print(r.status_code, [(a["rule_id"], a["ip"]) for a in r.json()])

print("\n=== /api/stats ===")
r = client.get("/api/stats")
print(r.status_code, r.json())
