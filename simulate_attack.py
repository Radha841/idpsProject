"""Append fake SSH attack lines to a log file, one per second, so the live watcher can react.

    python simulate_attack.py live.log            # brute force only
    python simulate_attack.py live.log --chain    # brute force + login + sudo
    python simulate_attack.py live.log --ip 9.9.9.8
"""
import argparse
import time

ap = argparse.ArgumentParser()
ap.add_argument("file")
ap.add_argument("--ip", default="9.9.9.9")
ap.add_argument("--chain", action="store_true")
args = ap.parse_args()

lines = [f"Sep 29 10:32:{i:02d} server sshd[1]: Failed password for deploy from {args.ip} port 40 ssh2"
         for i in range(1, 7)]
if args.chain:
    lines.append(f"Sep 29 10:33:00 server sshd[2]: Accepted password for deploy from {args.ip} port 41 ssh2")
    lines.append("Sep 29 10:35:00 server sudo:   deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash")

for line in lines:
    with open(args.file, "a", encoding="utf-8") as f:
        f.write(line + "\n")
    print("wrote:", line)
    time.sleep(1)