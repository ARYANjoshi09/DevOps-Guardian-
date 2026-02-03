import { WebClient } from "@slack/web-api";

export class SlackService {
  private client: WebClient;
  private channelId: string;

  constructor(botToken: string, channelId: string) {
    this.client = new WebClient(botToken);
    this.channelId = channelId;
  }

  /**
   * Send approval request for production errors
   */
  /**
   * Send approval request for production errors with detailed report file
   */
  /**
   * Send approval request for production errors with Block Kit and File
   */
  async sendIncidentNotification(incident: {
    id: string;
    title: string;
    rcaAnalysis: string;
    patchSummary: string;
  }) {
    try {
      // 1. Create detailed report content for file upload
      const reportContent = `# Incident Report: ${incident.title}
Incident ID: ${incident.id}
Timestamp: ${new Date().toISOString()}

## 1. Root Cause Analysis
${incident.rcaAnalysis}

## 2. Proposed Fix (Patch)
${incident.patchSummary}
`;

      // 2. Upload file
      let filePermalink = "";
      try {
        const fileUpload = await this.client.files.uploadV2({
          channel_id: this.channelId,
          content: reportContent,
          filename: `incident-${incident.id.substring(0, 8)}.md`,
          title: `Report: ${incident.title}`,
          initial_comment: "📄 *Detailed Incident Report attached*",
        });
        filePermalink = (fileUpload as any).file?.permalink || "";
      } catch (uploadError) {
        console.error("[Slack] File upload failed:", uploadError);
      }

      // 3. Format RCA and Patch for Blocks (Markdown link conversion)
      const formatMrkdwn = (text: string) => text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>");

      const rcaPreview = formatMrkdwn(incident.rcaAnalysis.substring(0, 1000));
      // Extract diff blocks or use summary
      const patchPreview = formatMrkdwn(incident.patchSummary.substring(0, 1000));

      // 4. Send Approval Card (Blocks)
      await this.client.chat.postMessage({
        channel: this.channelId,
        text: `🚨 Production Incident: ${incident.title}`, // Fallback
        blocks: [
          // Header
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🚨 ${incident.title.substring(0, 140)}`, // Slack header max 150 chars
              emoji: true,
            },
          },
          // RCA Section
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Root Cause Analysis:*\n${rcaPreview}`,
            },
          },
          // Divider
          { type: "divider" },
          // Code Diff Section
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Proposed Fix:*\n\`\`\`${patchPreview}\`\`\``,
            },
          },
          // Context (File Link)
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `📄 <${filePermalink}|View Full Incident Report> (PDF/Markdown)`,
              },
            ],
          },
          // Action Row
          {
            type: "actions",
            block_id: `incident_${incident.id}`,
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "🧪 Verify in Sandbox" },
                style: "primary",
                action_id: "verify_fix",
                value: incident.id,
              },
              {
                type: "button",
                text: { type: "plain_text", text: "✅ Approve & PR" },
                action_id: "approve_pr",
                value: incident.id,
              },
              {
                type: "button",
                text: { type: "plain_text", text: "❌ Reject" },
                style: "danger",
                action_id: "reject_fix",
                value: incident.id,
              },
            ],
          },
        ],
      });
      console.log("[Slack] Enhanced notification sent for:", incident.id);
    } catch (error) {
      console.error("[Slack] Failed to send notification:", error);
    }
  }

  /**
   * Reply to a message thread (e.g., for Verification Logs)
   */
  async replyToThread(channelId: string, threadTs: string, text: string) {
    try {
      await this.client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: text,
      });
    } catch (error) {
      console.error("[Slack] Failed to reply to thread:", error);
    }
  }

  /**
   * Notify after CI/CD auto-fix completes
   */
  async sendAutoFixCompletedNotification(incident: {
    title: string;
    rcaAnalysis: string;
    filesChanged: string[];
    prUrl: string;
  }) {
    try {
      await this.client.chat.postMessage({
        channel: this.channelId,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🤖 CI/CD Error Auto-Fixed",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Bug:* ${incident.title}\n\n*Root Cause:*\n${incident.rcaAnalysis.substring(0, 400)}...\n\n*Files Changed:*\n${incident.filesChanged
                .slice(0, 5)
                .map((f) => `• \`${f}\``)
                .join("\n")}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✅ *PR Created:* <${incident.prUrl}|View on GitHub>`,
            },
          },
        ],
      });
      console.log("[Slack] Auto-fix notification sent");
    } catch (error) {
      console.error("[Slack] Failed to send auto-fix notification:", error);
    }
  }

  /**
   * Notify after PR is created for production fixes
   */
  async sendPRCreatedNotification(prUrl: string, incidentTitle: string) {
    try {
      await this.client.chat.postMessage({
        channel: this.channelId,
        text: `✅ PR Created: ${prUrl}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✅ *Production Fix Ready for Review*\n\n*Incident:* ${incidentTitle}\n*Pull Request:* <${prUrl}|View on GitHub>`,
            },
          },
        ],
      });
      console.log("[Slack] PR created notification sent");
    } catch (error) {
      console.error("[Slack] Failed to send PR notification:", error);
    }
  }

  /**
   * Test Slack connection
   */
  async testConnection() {
    try {
      const result = await this.client.chat.postMessage({
        channel: this.channelId,
        text: "🤖 DevOps Guardian connected! I'll notify you when production errors are detected.",
      });
      return { success: true, messageId: result.ts };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
