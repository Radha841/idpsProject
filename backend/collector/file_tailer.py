"""Collector: gets raw lines from files (one-shot), live files (tail -f) or uploads."""
import os
import time


def read_file(path, encoding="utf-8"):
    """Yield every line of a finished log file."""
    with open(path, "r", encoding=encoding, errors="replace") as f:
        for line in f:
            yield line.rstrip("\r\n")


def tail_file(path, poll_interval=0.5, from_start=False, stop_event=None):
    """Yield new lines as they are appended, like `tail -f`.

    stop_event: optional threading.Event; set it to end the loop cleanly.
    Handles log rotation/truncation by starting again from the top.
    """
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        if not from_start:
            f.seek(0, os.SEEK_END)
        while not (stop_event and stop_event.is_set()):
            line = f.readline()
            if line:
                yield line.rstrip("\r\n")
                continue
            if os.path.getsize(path) < f.tell():  # file was truncated / rotated
                f.seek(0)
            time.sleep(poll_interval)


def read_upload(content):
    """Lines from an uploaded file (bytes or str), used by the /api/logs/upload endpoint."""
    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="replace")
    return content.splitlines()
