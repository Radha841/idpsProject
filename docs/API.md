# API Reference

Base URL when running locally: `http://localhost:8000`

Interactive docs (try every endpoint from the browser): `http://localhost:8000/docs`

## Logs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/logs` | List/search logs. Filters: `ip`, `source`, `keyword`, `limit` |
| POST | `/api/logs/upload` | Upload a log file (multipart form, field name `file`). Runs it through the full pipeline and returns alert count |

## Alerts

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/alerts` | List alerts. Filters: `severity`, `status`, `limit` |
| PATCH | `/api/alerts/{id}` | Update alert status, e.g. `?status=Reviewed` |

## Incidents

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/incidents` | List correlated incidents |
| GET | `/api/incidents/{id}` | Full timeline for one incident |

## Stats

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/stats` | Counts for dashboard cards: total logs, total alerts, critical alerts, blocked IPs, honeytoken hits, alerts by rule |

## Rules

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/rules` | List rules from `backend/config/rules.json` |
| POST | `/api/rules` | Append a new rule (JSON body matching the rules.json schema). Reloads immediately, no restart needed |

## Blocked IPs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/blocked-ips` | List currently blocked IPs |
| POST | `/api/blocked-ips?ip=...&reason=...` | Manually block an IP |
| DELETE | `/api/blocked-ips/{ip}` | Unblock an IP |

## Honeytoken

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/admin-secret-backup` | Decoy route. Any hit fires R009 (Critical) and logs to `honeytoken_hits` |

## Live updates

| Protocol | Endpoint | Purpose |
|---|---|---|
| WebSocket | `/ws/alerts` | Pushes each new alert dict to connected clients the moment it's created |
