# Setup & Running the Project

Requires Python 3.10 or newer.

## 1. Install

```
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
```

## 2. Run the automated tests

This is the fastest way to confirm your checkout actually works, no server needed.

```
python -m pytest -v
```

All 18 tests (collector, parser, detection, correlation) should pass.

## 3. See detection results from the command line (no API needed)

```
python -m backend.run_demo sample_logs/attack_auth.log --year 2026
python -m backend.run_demo sample_logs/attack_web.log
```

This prints each alert and incident straight to the console as the pipeline processes
the sample attack logs. Good for checking detection/correlation logic in isolation.

Watch a log file live, the way a real collector would:

```
python -m backend.run_demo live.log --follow --year 2026
```

## 4. Run the full API and see live output

Start the server:

```
uvicorn backend.api.main:app --reload
```

Then, with the server running:

- Open `http://localhost:8000/docs` in a browser. This is FastAPI's auto-generated
  interactive page, every endpoint listed in `docs/API.md` can be called directly
  from here with a "Try it out" button, no frontend or curl needed yet.
- Upload a sample log through `/api/logs/upload` (use `sample_logs/attack_auth.log`)
  and then call `GET /api/alerts` and `GET /api/incidents` to see the results.
- Visit `http://localhost:8000/api/admin-secret-backup` directly to trigger the
  honeytoken, then call `GET /api/alerts?severity=Critical` to see R009 fire.

## 5. One-shot smoke test script

`smoke_test_api.py` at the project root runs steps 4's flow automatically and prints
the results: upload, alerts, incidents, blocked IPs, honeytoken hit, stats.

```
python3 smoke_test_api.py
```

## 6. Once the frontend exists

```
cd frontend
npm install
npm run dev
```

The dashboard will read from the same API started in step 4, so start the backend first.
