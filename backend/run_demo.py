"""Try your whole part without a database or frontend.

    python -m backend.run_demo sample_logs/attack_auth.log --year 2026
    python -m backend.run_demo sample_logs/attack_web.log
    python -m backend.run_demo /var/log/auth.log --follow
"""
import argparse
import json

from backend.pipeline import Pipeline


def main():
    ap = argparse.ArgumentParser(description="Run the IDPS core on a log file")
    ap.add_argument("file")
    ap.add_argument("--year", type=int, default=None, help="year for syslog lines (they have none)")
    ap.add_argument("--source", choices=["ssh", "web"], default=None)
    ap.add_argument("--follow", action="store_true", help="keep watching the file (tail -f)")
    ap.add_argument("--json", action="store_true", help="print incidents as JSON")
    args = ap.parse_args()

    def show_alert(a):
        print(f"[ALERT {a['severity']:<8}] {a['timestamp']}  {a['rule_id']} {a['rule_name']}  "
              f"ip={a['ip']} user={a['user']}\n    {a['description']}")

    pipe = Pipeline(year=args.year, on_alert=show_alert)
    if args.follow:
        print(f"Watching {args.file} ... Ctrl+C to stop")
        try:
            pipe.follow_file(args.file, args.source)
        except KeyboardInterrupt:
            pass
    else:
        pipe.process_file(args.file, args.source)

    print(f"\nlines={pipe.stats['lines']} parsed={pipe.stats['parsed']} alerts={pipe.stats['alerts']}")
    print(f"incidents={len(pipe.correlator.incidents)} (merged: {len(pipe.correlator.correlated())})")
    for inc in pipe.correlator.incidents:
        d = inc.to_dict()
        if args.json:
            print(json.dumps(d, indent=2))
        else:
            print(f"\n{d['id']}  [{d['severity']}]  {d['title']}")
            for a in d["timeline"]:
                print(f"   {a['timestamp']}  {a['rule_id']}  {a['rule_name']}")


if __name__ == "__main__":
    main()
