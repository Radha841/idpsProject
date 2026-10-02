# Log Monitoring and Threat Detection System (IDPS)

A web-based Intrusion Detection and Prevention System that reads system and web server logs,
detects malicious activity with rule-based detection, and groups related alerts into a single
incident timeline.

## Features

- Collects logs from files, live log streaming (like `tail -f`) and uploads
- Parses SSH (`auth.log`) and Apache/Nginx access logs into one common record format
- Detects attacks using configurable signature and threshold rules
- Correlates related alerts (same IP or user, 10-minute window) into one incident
- Rules are stored in JSON, so new rules need no code change
- Alert deduplication (cooldown) to avoid alert flooding

## Detection rules

| ID | Rule | Trigger | Severity |
|---|---|---|---|
| R001 | SSH brute force | 5 or more failed logins from one IP within 60 seconds | High |
| R002 | Privilege escalation | sudo/su by a non-admin user | High |
| R003 | Unusual login time | Login outside 09:00-21:00 | Medium |
| R004 | SQL injection | SQL patterns in the request URL | High |
| R005 | Cross-site scripting (XSS) | Script patterns in the request | Medium |
| R006 | Directory traversal | `../` or `etc/passwd` in the request | High |
| R007 | Request flood / DoS | 100 or more requests from one IP within 10 seconds | Medium |
| R008 | Login after brute force | Successful login from an IP that just triggered R001 | Critical |
| R009 | Honeytoken endpoint touched | Any request to the decoy endpoint (`/api/admin-secret-backup`) | Critical |

Each alert carries a recommended `action` (for example `block_ip`) used by the response module.

## How it works

```
Log file --> Collector --> Parser --> Detection engine --> Correlation engine --> Incidents
                         (record)     (alerts)             (incident timeline)
```

1. **Collector** reads lines from a file, an upload or a live log.
2. **Parser** converts each line into a record with fields: `timestamp, source, ip, user, event_type, request, status_code, raw_line`.
3. **Detection engine** checks every record against the enabled rules in `backend/config/rules.json`.
4. **Correlation engine** merges alerts that share an IP or user within a time window into one incident.

## Project structure

```
backend/
  collector/     reads log files (one-shot, live, upload)
  parser/        regex parsers for SSH and web logs
  detection/     rule engine (pattern, threshold, privilege, off-hours, sequence)
  correlation/   groups alerts into incidents
  config/        rules.json
  api/           REST API and database
  pipeline.py    connects collector, parser, detection and correlation
  run_demo.py    command-line runner
frontend/        React dashboard
sample_logs/     example attack logs
tests/           automated tests
docs/            report and diagrams
```

## Getting started

Requires Python 3.10 or newer.

```
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
```

Run the tests:

```
python -m pytest -v
```

Analyse a log file:

```
python -m backend.run_demo sample_logs/attack_auth.log --year 2026
python -m backend.run_demo sample_logs/attack_web.log
```

Watch a log file live:

```
python -m backend.run_demo live.log --follow --year 2026
```

## Adding a detection rule

Add an entry to `backend/config/rules.json`:

```json
{
  "id": "R009", "name": "Command injection", "type": "pattern", "enabled": true,
  "event_type": "web_request", "field": "request", "cooldown_seconds": 60,
  "patterns": ["; *cat ", "\\| *whoami"],
  "severity": "High", "action": "block_ip"
}
```

## Tech stack

Python 3, FastAPI, SQLite, React, Tailwind CSS, pytest.

## Team

| Member | Responsibility |
|---|---|
| Member 1 | Log collection, parsing, detection and correlation |
| Member 2 | Backend API, database, response |
| Member 3 | Frontend dashboard |
| Member 4 | Test data, testing, documentation |
