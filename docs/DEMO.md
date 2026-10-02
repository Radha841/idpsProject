# Testing & Demo Script

## Test scenarios

| Test | How to trigger | Expected result |
|---|---|---|
| Brute force | 5+ failed SSH logins from one IP within 60 sec | R001, High alert |
| Login after brute force | Successful login from that same IP within 10 min | R008, Critical, merges into the same incident as R001 |
| Privilege escalation | sudo/su by a non-admin user | R002, High |
| Unusual login time | Login outside 09:00-21:00 | R003, Medium |
| SQL injection | `' OR 1=1`, `UNION SELECT` in the request URL | R004, High |
| XSS | `<script>` or `onerror=` in the request | R005, Medium |
| Directory traversal | `../` or `etc/passwd` in the request | R006, High |
| Request flood | 100+ requests from one IP within 10 sec | R007, Medium |
| Honeytoken | Any request to `/api/admin-secret-backup` | R009, Critical, instant, zero prior false positives |
| Normal traffic | Ordinary log lines, no attack patterns | No alerts (false-positive check) |

Run these against the sample logs in `sample_logs/`, or via `smoke_test_api.py`
(see `docs/SETUP.md` section 5).

## Live demo order (about 5-6 minutes)

1. Log in / open the dashboard (empty state).
2. Start the attack simulation (`simulate_attack.py` or upload `sample_logs/attack_auth.log`).
3. Show the live alert and charts updating on the dashboard.
4. Open an alert's details and show the raw log lines that triggered it.
5. Show correlation collapsing the brute-force + login + privilege-escalation
   sequence into one incident on the Incident Timeline page.
6. Visit the honeytoken endpoint live (click the link or `curl`) and show the
   instant Critical alert appear, with no setup or threshold involved.
7. Show the attacking IP in Blocked IPs.
8. Upload a fresh log file and show detection happening on it.
9. Add a new rule from the Rules page and trigger it live.

## Likely viva questions

- **IDS vs IPS?** IDS detects and alerts; IPS also acts. This project does both:
  detection via the rules engine, prevention via the `block_ip` response action.
- **IDPS vs SIEM?** IDPS focuses on detecting and stopping attacks; SIEM collects and
  correlates logs across sources for analysis. This project does both, the correlation
  engine is the SIEM half.
- **Why signature-based detection?** Simple, fast, gives a clear reason for every alert.
  Weak against unknown attacks, which the honeytoken and any future ML layer cover
  from a different angle.
- **What is a honeytoken and why use one?** A decoy resource with no legitimate use.
  Any interaction with it is by definition malicious, so it gives a high-confidence
  alert with no threshold tuning and no false positives, a detection method that
  doesn't depend on knowing the attack pattern in advance.
- **How do you reduce false positives?** Tune thresholds, dedupe alerts (cooldowns in
  rules.json), test against normal traffic. The honeytoken has none by design.
- **How could this be improved?** Real-time streaming ingestion, GeoIP lookup,
  threat-intel feeds, more honeytoken types, an ML anomaly layer.
