export const mockAlerts = [
  { id: 101, timestamp: "2026-10-02T10:31:20Z", rule_id: "BRUTE-01", rule_name: "Brute-force login", severity: "High", ip: "185.23.41.77", description: "7 failed SSH logins from the same IP within 60 seconds.", status: "New" },
  { id: 102, timestamp: "2026-10-02T10:30:42Z", rule_id: "SQLI-01", rule_name: "SQL injection", severity: "High", ip: "45.91.18.20", description: "Suspicious SQL expression detected in request URL.", status: "Reviewed" },
  { id: 103, timestamp: "2026-10-02T10:28:05Z", rule_id: "XSS-01", rule_name: "Cross-site scripting", severity: "Medium", ip: "91.204.12.31", description: "Script tag detected in web request.", status: "New" },
  { id: 104, timestamp: "2026-10-02T10:24:12Z", rule_id: "TRAV-01", rule_name: "Directory traversal", severity: "High", ip: "103.11.92.5", description: "Traversal pattern ../../etc/passwd detected.", status: "New" },
  { id: 105, timestamp: "2026-10-02T10:20:02Z", rule_id: "FLOOD-01", rule_name: "Request flood / DoS", severity: "Medium", ip: "45.91.18.20", description: "More than 100 requests from one IP in 10 seconds.", status: "Closed" }
];

export const mockIncidents = [
  { id: 501, title: "SSH compromise sequence", ip: "185.23.41.77", user: "admin", start_time: "2026-10-02T10:22:00Z", end_time: "2026-10-02T10:31:20Z", linked_alert_ids: [101], status: "Open" },
  { id: 502, title: "Web application attack chain", ip: "45.91.18.20", user: "-", start_time: "2026-10-02T10:17:00Z", end_time: "2026-10-02T10:30:42Z", linked_alert_ids: [102, 105], status: "Investigating" }
];

export const mockLogs = [
  { id: 1, timestamp: "2026-10-02T10:31:20Z", source: "auth.log", ip: "185.23.41.77", user: "admin", event_type: "ssh_failed", request: "-", status_code: 401, raw_line: "Oct 02 10:31 sshd[1122]: Failed password for admin from 185.23.41.77" },
  { id: 2, timestamp: "2026-10-02T10:30:42Z", source: "access.log", ip: "45.91.18.20", user: "-", event_type: "http_request", request: "/product?id=1' OR '1'='1", status_code: 200, raw_line: 'GET /product?id=1%27%20OR%20%271%27=%271 HTTP/1.1 200' },
  { id: 3, timestamp: "2026-10-02T10:28:05Z", source: "access.log", ip: "91.204.12.31", user: "-", event_type: "http_request", request: "/search?q=<script>alert(1)</script>", status_code: 200, raw_line: "GET /search?q=<script>alert(1)</script> HTTP/1.1 200" },
  { id: 4, timestamp: "2026-10-02T10:24:12Z", source: "access.log", ip: "103.11.92.5", user: "-", event_type: "http_request", request: "/../../etc/passwd", status_code: 404, raw_line: "GET /../../etc/passwd HTTP/1.1 404" }
];

export const mockRules = [
  { id: 1, name: "Brute-force login", type: "threshold", config: "5+ failed logins / IP / 60 sec", severity: "High", enabled: true },
  { id: 2, name: "Privilege escalation", type: "pattern", config: "sudo/su by non-admin", severity: "High", enabled: true },
  { id: 3, name: "Unusual login time", type: "time", config: "outside 09:00-21:00", severity: "Medium", enabled: true },
  { id: 4, name: "SQL injection", type: "pattern", config: "' OR 1=1, UNION SELECT, --", severity: "High", enabled: true },
  { id: 5, name: "Cross-site scripting", type: "pattern", config: "<script>, onerror=", severity: "Medium", enabled: true },
  { id: 6, name: "Directory traversal", type: "pattern", config: "../../etc/passwd", severity: "High", enabled: true },
  { id: 7, name: "Request flood / DoS", type: "threshold", config: "100+ requests / IP / 10 sec", severity: "Medium", enabled: false }
];

export const mockBlockedIps = [
  { id: 1, ip: "185.23.41.77", reason: "Brute-force login", blocked_at: "2026-10-02T10:32:00Z", unblocked_at: null },
  { id: 2, ip: "103.11.92.5", reason: "Directory traversal", blocked_at: "2026-10-02T10:25:00Z", unblocked_at: null }
];

export const mockStats = {
  total_logs: 12842,
  total_alerts: 27,
  active_incidents: 4,
  blocked_ips: 9,
  alerts_over_time: [
    { time: "09:00", alerts: 1 }, { time: "10:00", alerts: 3 }, { time: "11:00", alerts: 7 },
    { time: "12:00", alerts: 4 }, { time: "13:00", alerts: 9 }, { time: "14:00", alerts: 3 }
  ],
  attack_types: [
    { name: "Brute force", value: 8 }, { name: "SQL injection", value: 6 },
    { name: "XSS", value: 4 }, { name: "Traversal", value: 5 }, { name: "DoS", value: 4 }
  ],
  top_ips: [
    { ip: "185.23.41.77", count: 8 }, { ip: "45.91.18.20", count: 6 },
    { ip: "103.11.92.5", count: 5 }, { ip: "91.204.12.31", count: 4 }
  ]
};
