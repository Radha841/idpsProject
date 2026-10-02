# Architecture

## Data flow

```
Log source --> Collector --> Parser --> Detection engine --> Correlation engine --> Response/DB --> Dashboard
(file/upload)  (tails/reads)  (regex)    (rules.json)         (groups by ip/user)    (block_ip,       (React)
                                                                                       SQLite)
```

One direction only. Every stage hands a plain dict to the next stage, no stage reaches
back into an earlier one.

## Component ownership

| Stage | Folder | Built by |
|---|---|---|
| Collector | `backend/collector/` | Member 1 |
| Parser | `backend/parser/` | Member 1 |
| Detection engine | `backend/detection/` | Member 1 |
| Correlation engine | `backend/correlation/` | Member 1 |
| Database, API, response, honeytoken | `backend/api/` | Member 2 |
| Dashboard | `frontend/` | Member 3 |
| Sample data, test scripts, docs | `sample_logs/`, `tests/`, `docs/` | Member 4 |

## Record shapes

These three shapes are the contract between stages. Every stage after the one that
produces a shape uses the exact same field names, nothing gets renamed along the way.

**Record** (Parser output, Detection engine input):
`timestamp, source, ip, user, event_type, request, status_code, raw_line`

**Alert** (Detection engine output, Correlation + Response input):
`id, rule_id, rule_name, severity, timestamp, ip, user, description, evidence, action, status`

**Incident** (Correlation engine output, Database + Dashboard input):
`id, title, ip, user, start_time, end_time, severity, status, alert_count, linked_alert_ids, timeline`

## Database (SQLite, `idps.db`)

| Table | Purpose |
|---|---|
| `logs` | every parsed record |
| `alerts` | every rule match |
| `incidents` | correlated alert groups |
| `blocked_ips` | result of the `block_ip` action |
| `honeytoken_hits` | raw log of decoy touches (separate from alerts, for evidence) |
| `rules` | reserved for a future DB-backed rule store; rules currently live in `backend/config/rules.json` |

## Honeytoken (deception-based detection)

`/api/admin-secret-backup` is a decoy route with no real function. Any request to it,
from anyone, is logged to `honeytoken_hits` and replayed through the normal pipeline as
a web request, so it triggers rule R009 exactly like real traffic would. Unlike every
other rule, it needs no threshold or pattern tuning: one hit is always a true positive,
because nothing legitimate should ever call this endpoint.
