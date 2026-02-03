import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  GetLogEventsCommand,
  DescribeLogGroupsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

export interface LogEvent {
  timestamp: Date;
  message: string;
  source: string;
  severity?: "INFO" | "WARN" | "ERROR" | "CRITICAL";
}

export interface LogStreamConfig {
  provider: "cloudwatch" | "datadog" | "custom";
  // CloudWatch specific
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  logGroupName?: string;
  // Datadog specific
  datadogApiKey?: string;
  datadogAppKey?: string;
  datadogSite?: string; // e.g., "datadoghq.com" or "datadoghq.eu"
  // Custom webhook
  webhookUrl?: string;
}

export class LogStreamService {
  private cloudwatchClient?: CloudWatchLogsClient;
  private config: LogStreamConfig;

  constructor(config: LogStreamConfig) {
    this.config = config;

    if (config.provider === "cloudwatch") {
      this.cloudwatchClient = new CloudWatchLogsClient({
        region: config.awsRegion || "us-east-1",
        credentials: {
          accessKeyId: config.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: config.awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      });
    }
  }

  /**
   * Lists available log groups (CloudWatch)
   */
  async listLogGroups(): Promise<string[]> {
    if (this.config.provider !== "cloudwatch" || !this.cloudwatchClient) {
      throw new Error("CloudWatch not configured");
    }

    const command = new DescribeLogGroupsCommand({});
    const response = await this.cloudwatchClient.send(command);

    return response.logGroups?.map((lg) => lg.logGroupName || "") || [];
  }

  /**
   * Fetches recent log events from CloudWatch
   */
  async getCloudWatchLogs(
    logGroupName: string,
    filterPattern?: string,
    startTime?: Date,
    limit: number = 100,
  ): Promise<LogEvent[]> {
    if (!this.cloudwatchClient) {
      throw new Error("CloudWatch not configured");
    }

    const now = Date.now();
    const start = startTime?.getTime() || now - 3600000; // Default: last hour

    const command = new FilterLogEventsCommand({
      logGroupName,
      filterPattern: filterPattern || "?ERROR ?error ?Error ?CRITICAL ?Exception",
      startTime: start,
      endTime: now,
      limit,
    });

    const response = await this.cloudwatchClient.send(command);

    return (
      response.events?.map((event) => ({
        timestamp: new Date(event.timestamp || Date.now()),
        message: event.message || "",
        source: `cloudwatch:${logGroupName}`,
        severity: this.detectSeverity(event.message || ""),
      })) || []
    );
  }

  /**
   * Fetches logs from Datadog
   * Uses the Datadog Logs API
   */
  async getDatadogLogs(
    query: string = "status:error",
    timeRange: number = 3600,
  ): Promise<LogEvent[]> {
    if (this.config.provider !== "datadog") {
      throw new Error("Datadog not configured");
    }

    const apiKey = this.config.datadogApiKey;
    const appKey = this.config.datadogAppKey;
    const site = this.config.datadogSite || "datadoghq.com";

    if (!apiKey || !appKey) {
      throw new Error("Datadog API/App keys not configured");
    }

    const now = Date.now();
    const from = now - timeRange * 1000;

    const response = await fetch(`https://api.${site}/api/v2/logs/events/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": apiKey,
        "DD-APPLICATION-KEY": appKey,
      },
      body: JSON.stringify({
        filter: {
          query,
          from: new Date(from).toISOString(),
          to: new Date(now).toISOString(),
        },
        sort: "timestamp",
        page: { limit: 100 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status}`);
    }

    const data = await response.json();

    return (
      data.data?.map((log: any) => ({
        timestamp: new Date(log.attributes?.timestamp || Date.now()),
        message: log.attributes?.message || JSON.stringify(log.attributes),
        source: `datadog:${log.attributes?.service || "unknown"}`,
        severity: log.attributes?.status?.toUpperCase() || "INFO",
      })) || []
    );
  }

  /**
   * Unified method to get logs from configured provider
   */
  async getLogs(
    options: { query?: string; startTime?: Date; limit?: number } = {},
  ): Promise<LogEvent[]> {
    switch (this.config.provider) {
      case "cloudwatch":
        if (!this.config.logGroupName) {
          throw new Error("Log group name required for CloudWatch");
        }
        return this.getCloudWatchLogs(
          this.config.logGroupName,
          options.query,
          options.startTime,
          options.limit,
        );

      case "datadog":
        return this.getDatadogLogs(options.query || "status:error");

      default:
        throw new Error(`Provider ${this.config.provider} not supported`);
    }
  }

  /**
   * Detect severity from log message
   */
  private detectSeverity(message: string): LogEvent["severity"] {
    const lower = message.toLowerCase();
    if (lower.includes("critical") || lower.includes("fatal")) return "CRITICAL";
    if (lower.includes("error") || lower.includes("exception")) return "ERROR";
    if (lower.includes("warn")) return "WARN";
    return "INFO";
  }
}
