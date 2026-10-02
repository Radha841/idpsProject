"""Glue: collector -> parser -> detection -> correlation.

The database and WebSocket layer plug in through the three callbacks:

    pipe = Pipeline(on_record=save_log, on_alert=save_alert_and_push, on_incident=save_incident)
    pipe.process_file("auth.log")          # one-shot / upload
    pipe.follow_file("/var/log/auth.log")  # live (run in a background thread)
"""
from backend.collector import read_file, tail_file
from backend.correlation import Correlator
from backend.detection import DetectionEngine
from backend.parser import parse_line


class Pipeline:
    def __init__(self, rules_path=None, year=None, correlation_window=600,
                 on_record=None, on_alert=None, on_incident=None):
        self.engine = DetectionEngine(rules_path) if rules_path else DetectionEngine()
        self.correlator = Correlator(correlation_window)
        self.year = year
        self.on_record = on_record
        self.on_alert = on_alert
        self.on_incident = on_incident
        self.stats = {"lines": 0, "parsed": 0, "alerts": 0}

    def process_line(self, line, source=None):
        """Run one raw line through everything. Returns {record, alerts, incidents} or None."""
        self.stats["lines"] += 1
        record = parse_line(line, source=source, year=self.year)
        if record is None:
            return None
        self.stats["parsed"] += 1
        if self.on_record:
            self.on_record(record)

        alerts = self.engine.evaluate(record)
        incidents = []
        for alert in alerts:
            self.stats["alerts"] += 1
            if self.on_alert:
                self.on_alert(alert)
            incident = self.correlator.process(alert)
            incidents.append(incident.to_dict())
            if self.on_incident:
                self.on_incident(incident.to_dict())
        return {"record": record, "alerts": alerts, "incidents": incidents}

    def process_lines(self, lines, source=None):
        results = []
        for line in lines:
            out = self.process_line(line, source)
            if out and out["alerts"]:
                results.append(out)
        return results

    def process_file(self, path, source=None):
        return self.process_lines(read_file(path), source)

    def follow_file(self, path, source=None, stop_event=None):
        for line in tail_file(path, stop_event=stop_event):
            self.process_line(line, source)
