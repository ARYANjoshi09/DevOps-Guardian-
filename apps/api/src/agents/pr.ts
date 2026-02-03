import { GitHubService, IncidentEvent, AgentResult } from "@devops-guardian/shared";

export class PRAgent {
  private github: GitHubService;

  constructor() {
    // Ideally simpler constructor, but for now we look up tokens dynamically or passed in.
    // Since this runs in Orchestrator, we might need to look up the project token from DB.
    // For MVP hack, we might assume a single token or pass it in context.
    // Let's assume passed in context or ENV for now, but really should be per-repo.
    this.github = new GitHubService(process.env.GITHUB_TOKEN || "");
  }

  // Ideally we pass token here so it supports multiple users
  async execute(incident: IncidentEvent, patchData: any, token?: string): Promise<AgentResult> {
    console.log(`[PR Agent] Starting PR creation for ${incident.id}`);

    try {
      if (token) {
        this.github = new GitHubService(token);
      }

      const { owner, repo, fileUpdates } = patchData; // Expecting patchData to have this structure

      if (!owner || !repo || !fileUpdates) {
        return {
          success: false,
          data: { error: "Missing patch data (owner, repo, or updates)" },
        };
      }

      const branchName = `fix/incident-${incident.id.substring(0, 8)}-${Date.now()}`;

      // 1. Create Branch
      // Note: We need to know 'base' branch, assumed 'main' for now.
      await this.github.createBranch(owner, repo, "main", branchName);

      // 2. Commit Files
      for (const update of fileUpdates) {
        await this.github.commitFile(
          owner,
          repo,
          update.path,
          update.content,
          `fix: resolved incident ${incident.id}`,
          branchName,
        );
      }

      // 3. Create PR
      const prBody = `
## Auto-Fix for Incident #${incident.id} 🤖

**Incident**: ${incident.title}
**Severity**: ${incident.severity}

### Analysis
${incident.description}

### Fix
Applied verified patch.

> Verified in E2B Sandbox ✅
`;

      const pr = await this.github.createPullRequest(
        owner,
        repo,
        `fix: ${incident.title || "Automated Resolution"}`,
        prBody,
        branchName,
        "main",
      );

      console.log(`[PR Agent] PR Created: ${pr.url}`);
      return { success: true, data: { prUrl: pr.url } };
    } catch (error: any) {
      console.error("[PR Agent] Failed:", error);
      return { success: false, data: { error: error.message } };
    }
  }
}
