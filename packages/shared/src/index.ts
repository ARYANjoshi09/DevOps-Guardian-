export type IncidentEvent = {
  id: string;
  source: "GITHUB" | "SENTRY" | "DATADOG";
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  timestamp: Date;
};
