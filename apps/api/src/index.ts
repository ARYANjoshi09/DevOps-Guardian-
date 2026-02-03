import dotenv from "dotenv";
import path from "path";

// robustly load .env from monorepo root
// When running via 'npm run dev --workspace=apps/api', CWD is apps/api
// So we need to go up 2 levels: apps/api -> apps -> root
const envPath = path.resolve(process.cwd(), "../../.env");
dotenv.config({ path: envPath });

console.log(`[API] Loading .env from: ${envPath}`);
console.log(
  "[API] Startup - GEMINI_API_KEY loaded:",
  process.env.GEMINI_API_KEY ? "YES (*******)" : "NO (Using fallback)",
);

import express from "express";

import cors from "cors";
import { orchestrator } from "./orchestrator";
import { IncidentEventSchema } from "@devops-guardian/shared";

const app = express();
const port = process.env.PORT || 3001;

app.use(
  cors({
    origin: ["http://localhost:3002", "http://127.0.0.1:3002"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);
app.use(express.json());

// Create HTTP server for Socket.io
import { createServer } from "http";
import { SocketService } from "./services/SocketService";

const httpServer = createServer(app);
const socketService = SocketService.getInstance();
socketService.initialize(httpServer);

import { onboardingRouter } from "./routes/onboarding";
import { authRouter } from "./routes/auth";
import { projectsRouter } from "./routes/projects";
import { watcherRouter } from "./routes/watcher";
import { logIngestionRouter } from "./routes/logIngestion";
import { slackRouter } from "./routes/slack";

app.use("/api/onboarding", onboardingRouter);
app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/watcher", watcherRouter);
app.use("/api/v1/logs", logIngestionRouter);
app.use("/api/slack", slackRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "DevOps Guardian API" });
});

/**
 * GitHub Webhook Endpoint - Real workflow_run failure parsing
 * Configure in GitHub: Settings > Webhooks > Add webhook
 * - Payload URL: https://your-domain/webhook/github
 * - Content type: application/json
 * - Events: Workflow runs
 */
app.post("/webhook/github", async (req, res) => {
  try {
    const event = req.headers["x-github-event"];
    const payload = req.body;

    console.log(`[Webhook] GitHub Event: ${event}`);

    // Only process failed workflow runs
    if (
      event === "workflow_run" &&
      payload.action === "completed" &&
      payload.workflow_run?.conclusion === "failure"
    ) {
      const run = payload.workflow_run;
      const repo = payload.repository;

      console.log(`[Webhook] Processing failed workflow: ${run.name} in ${repo.full_name}`);

      const incident = {
        id: crypto.randomUUID(),
        source: "GITHUB" as const,
        severity: "CRITICAL" as const,
        title: `Build Failed: ${run.name}`,
        description: `Workflow "${run.name}" failed on branch ${run.head_branch}. Commit: ${run.head_sha}`,
        message: `GitHub Actions workflow failed in ${repo.full_name}`,
        metadata: {
          owner: repo.owner.login,
          repo: repo.name,
          workflowName: run.name,
          branch: run.head_branch,
          commitSha: run.head_sha,
          runId: run.id,
          logsUrl: run.logs_url,
          htmlUrl: run.html_url,
          // Token should be looked up from DB based on project
          // For now, we'll rely on PRAgent looking it up
        },
        timestamp: new Date(),
      };

      // Async processing - don't block webhook response
      orchestrator.handleIncident(incident as any);

      // Emit socket event
      socketService.emitIncidentUpdate(incident);

      res.status(202).json({
        message: "Incident received, agents deployed.",
        incidentId: incident.id,
      });
    } else if (event === "workflow_run") {
      // Success or in-progress, just acknowledge
      res.status(200).json({ message: "Acknowledged (not a failure)" });
    } else {
      // Other events we don't care about
      res.status(200).json({ message: "Event ignored" });
    }
  } catch (error) {
    console.error("GitHub Webhook error:", error);
    res.status(400).json({ error: "Invalid payload" });
  }
});

/**
 * Jenkins Webhook Endpoint - Generic Notification Plugin format
 * Configure in Jenkins: Post-build Actions > HTTP Request
 * - URL: https://your-domain/webhook/jenkins
 * - Method: POST
 * - Body: JSON with build info
 */
app.post("/webhook/jenkins", async (req, res) => {
  try {
    const payload = req.body;

    console.log(`[Webhook] Jenkins Event Received`);

    // Jenkins doesn't have a standard webhook format, so we define our own
    // Expected format:
    // {
    //   "build_status": "FAILURE" | "SUCCESS",
    //   "job_name": "my-pipeline",
    //   "build_number": 42,
    //   "build_url": "http://jenkins/job/my-pipeline/42/",
    //   "git_repo": "owner/repo",
    //   "git_branch": "main",
    //   "git_commit": "abc123",
    //   "console_log": "... build output ..."
    // }

    if (payload.build_status === "FAILURE") {
      const [owner, repo] = (payload.git_repo || "unknown/unknown").split("/");

      console.log(
        `[Webhook] Processing failed Jenkins build: ${payload.job_name} #${payload.build_number}`,
      );

      const incident = {
        id: crypto.randomUUID(),
        source: "JENKINS" as const,
        severity: "CRITICAL" as const,
        title: `Jenkins Build Failed: ${payload.job_name} #${payload.build_number}`,
        description: `Jenkins job "${payload.job_name}" build #${payload.build_number} failed. Branch: ${payload.git_branch}`,
        message: payload.console_log?.substring(0, 2000) || "No logs provided",
        metadata: {
          owner,
          repo,
          jobName: payload.job_name,
          buildNumber: payload.build_number,
          buildUrl: payload.build_url,
          branch: payload.git_branch,
          commitSha: payload.git_commit,
          consoleLog: payload.console_log,
        },
        timestamp: new Date(),
      };

      orchestrator.handleIncident(incident as any);

      // Emit socket event
      socketService.emitIncidentUpdate(incident);

      res.status(202).json({
        message: "Jenkins failure received, agents deployed.",
        incidentId: incident.id,
      });
    } else {
      res.status(200).json({ message: "Acknowledged (not a failure)" });
    }
  } catch (error) {
    console.error("Jenkins Webhook error:", error);
    res.status(400).json({ error: "Invalid payload" });
  }
});

/**
 * Push-Based Log Webhook Endpoint
 *
 * Users configure their log systems (CloudWatch Lambda, Datadog, Fluentd, etc.)
 * to POST logs here. NO CREDENTIALS STORED in DevOps Guardian.
 *
 * Expected payload formats:
 *
 * Generic:
 * { "source": "cloudwatch|datadog|custom", "projectId": "...", "logs": ["log line 1", ...] }
 *
 * CloudWatch (via Lambda subscription):
 * { "awslogs": { "data": "base64-encoded-gzip" } }
 *
 * Datadog Webhook:
 * { "alertType": "error", "title": "...", "body": "..." }
 */
app.post("/webhook/logs", async (req, res) => {
  try {
    const payload = req.body;
    console.log(`[Webhook] Received log push`);

    let logs: string[] = [];
    let source = "custom";
    let projectId = payload.projectId || "unknown";

    // Handle CloudWatch Lambda subscription format
    if (payload.awslogs?.data) {
      const zlib = await import("zlib");
      const decoded = Buffer.from(payload.awslogs.data, "base64");
      const unzipped = zlib.gunzipSync(decoded).toString("utf-8");
      const cloudwatchData = JSON.parse(unzipped);
      logs = cloudwatchData.logEvents?.map((e: any) => e.message) || [];
      source = "cloudwatch";
      projectId = cloudwatchData.logGroup || projectId;
      console.log(`[Webhook] CloudWatch: ${logs.length} log events from ${projectId}`);
    }
    // Handle Datadog webhook format
    else if (payload.alertType || payload.event_type) {
      source = "datadog";
      logs = [payload.body || payload.msg || JSON.stringify(payload)];
      console.log(`[Webhook] Datadog alert: ${payload.title || "Unknown"}`);
    }
    // Handle generic format
    else if (payload.logs && Array.isArray(payload.logs)) {
      source = payload.source || "custom";
      logs = payload.logs;
      console.log(`[Webhook] Generic: ${logs.length} logs from ${source}`);
    }
    // Fallback: treat entire body as single log
    else if (typeof payload === "string" || payload.message) {
      logs = [payload.message || JSON.stringify(payload)];
    }

    if (logs.length === 0) {
      return res.status(200).json({ message: "No logs to process" });
    }

    // Emit live logs to socket
    logs.forEach((log) => socketService.emitLog(projectId, log));

    // Filter for errors
    const errorLogs = logs.filter((log) => {
      const lower = log.toLowerCase();
      return (
        lower.includes("error") ||
        lower.includes("exception") ||
        lower.includes("critical") ||
        lower.includes("fatal") ||
        lower.includes("failed")
      );
    });

    if (errorLogs.length === 0) {
      console.log(`[Webhook] No errors found in ${logs.length} logs. All clear.`);
      return res.status(200).json({ message: "Acknowledged (no errors)" });
    }

    console.log(`[Webhook] Found ${errorLogs.length} error(s)! Creating incident...`);

    // Create incident for each unique error (simplified: take first error)
    const incident = {
      id: crypto.randomUUID(),
      source: source.toUpperCase() as any,
      severity: "CRITICAL" as const,
      title: `Production Error: ${errorLogs[0].substring(0, 100)}`,
      description: errorLogs.join("\n").substring(0, 2000),
      message: `${errorLogs.length} error(s) detected from ${source}`,
      metadata: {
        projectId,
        logSource: source,
        errorCount: errorLogs.length,
        sampleErrors: errorLogs.slice(0, 5),
      },
      timestamp: new Date(),
    };

    // Trigger healing pipeline
    orchestrator.handleIncident(incident as any);

    // Emit socket event
    socketService.emitIncidentUpdate(incident);

    res.status(202).json({
      message: "Errors detected, healing pipeline triggered.",
      incidentId: incident.id,
      errorCount: errorLogs.length,
    });
  } catch (error: any) {
    console.error("Log Webhook error:", error);
    res.status(400).json({ error: error.message });
  }
});

// New Endpoint: Get all active incidents for the Dashboard
app.get("/incidents", (req, res) => {
  const incidents = orchestrator.getActiveIncidents();
  res.json({ incidents });
});

httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
