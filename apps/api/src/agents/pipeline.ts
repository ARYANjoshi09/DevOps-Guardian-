import { IAgent, AgentStatus, AgentResult, IncidentEvent } from "@devops-guardian/shared";
import { GitHubService, SecretsManagerService, VerificationService } from "@devops-guardian/shared";

export class PipelineAgent implements IAgent {
  name = "Pipeline Agent";
  status = AgentStatus.IDLE;
  private github: GitHubService;
  private secretsHelper: SecretsManagerService;
  private verifier: VerificationService;

  constructor(token: string) {
    this.github = new GitHubService(token);
    this.secretsHelper = new SecretsManagerService();
    this.verifier = new VerificationService();
  }

  async execute(incident: IncidentEvent): Promise<AgentResult> {
    throw new Error("Pipeline Agent is designed for direct calls, not event loop yet.");
  }

  async analyze(owner: string, repo: string) {
    this.status = AgentStatus.WORKING;
    console.log(`[Pipeline] Analyzing ${owner}/${repo}...`);

    try {
      // 1. Check for Existing Pipelines
      const rootFiles = await this.github.getRepoStructure(owner, repo, "");
      const fileNames = rootFiles.map((f: any) => f.name);

      if (fileNames.includes("Jenkinsfile")) {
        return { status: "EXISTS", type: "Jenkins", file: "Jenkinsfile" };
      }
      if (fileNames.includes("gitlab-ci.yml")) {
        return { status: "EXISTS", type: "GitLab", file: "gitlab-ci.yml" };
      }
      if (fileNames.includes("azure-pipelines.yml")) {
        return { status: "EXISTS", type: "Azure", file: "azure-pipelines.yml" };
      }

      // Check deep for GitHub Actions
      const workflows = await this.github.getRepoStructure(owner, repo, ".github/workflows");
      if (workflows.length > 0) {
        return {
          status: "EXISTS",
          type: "GitHub Actions",
          file: workflows[0].name,
        };
      }

      // 2. No Pipeline Found -> Detect Stack
      let stack = "unknown";
      if (fileNames.includes("package.json")) stack = "node";
      else if (fileNames.includes("requirements.txt") || fileNames.includes("pyproject.toml"))
        stack = "python";
      else if (fileNames.includes("go.mod")) stack = "go";
      else if (fileNames.includes("pom.xml")) stack = "java";

      return { status: "MISSING", suggestedStack: stack };
    } catch (error) {
      console.warn("[Pipeline] Analysis Partial/Failed:", error);
      // Fallback if .github folder doesn't exist (404)
      return { status: "MISSING", suggestedStack: "unknown" };
    } finally {
      this.status = AgentStatus.IDLE;
    }
  }

  async generatePipeline(owner: string, repo: string, type: string, envs?: Record<string, string>) {
    this.status = AgentStatus.WORKING;
    console.log(`[Pipeline] Generating ${type} pipeline for ${owner}/${repo}...`);

    try {
      // 1. Store Secrets if provided
      if (envs && Object.keys(envs).length > 0) {
        await this.secretsHelper.storeEnvVars(owner, repo, envs);
      }

      let content = "";
      let path = "";
      let message = "";

      if (type === "github-actions") {
        path = ".github/workflows/devops-guardian.yml";
        message = "ci: add devops guardian pipeline";
        content = `name: DevOps Guardian CI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js 18.x
      uses: actions/setup-node@v3
      with:
        node-version: 18.x
        cache: 'npm'
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test --if-present
`;
      } else if (type === "jenkins") {
        path = "Jenkinsfile";
        message = "ci: add jenkinsfile";
        content = `pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'npm install'
            }
        }
    }
}`;
      } else {
        throw new Error(`Unsupported pipeline type: ${type}`);
      }

      // 3. Verify in E2B (if key present)
      let verificationPassed = false;
      let verificationLogs: string[] = [];
      const e2bKey = process.env.E2B_API_KEY;

      if (e2bKey) {
        console.log("[Pipeline] Starting E2B Verification...");
        const repoUrl = `https://github.com/${owner}/${repo}.git`;
        const result = await this.verifier.verifyBuild(repoUrl, envs || {});
        verificationLogs = result.logs;

        if (!result.success) {
          console.warn("[Pipeline] Verification Failed in Sandbox:", result.logs);
          throw new Error("Verification Failed. Logs: " + result.logs.join("\n"));
        }
        verificationPassed = true;
        console.log("[Pipeline] Verification Passed!");
      } else {
        console.log("[Pipeline] Skipping Verification (No E2B Key detected)");
        // Strict Mode: Fail if no key (as per user request "don't do direct commit if not found show error")
        throw new Error("E2B_API_KEY is missing. Cannot verify pipeline.");
      }

      // 4. Create PR (Strict Mode: Only if verified)
      if (verificationPassed) {
        const branchName = `ci/devops-guardian-${Date.now()}`;

        // Create Branch
        await this.github.createBranch(owner, repo, "main", branchName);

        // Commit to Branch
        await this.github.commitFile(owner, repo, path, content, message, branchName);

        // Create PR
        const pr = await this.github.createPullRequest(
          owner,
          repo,
          "Add DevOps Guardian Pipeline",
          `Adds ${type} pipeline configuration.\n\n**Verification Status**: ✅ Passed\n\nLogs:\n\`\`\`\n${verificationLogs.join("\n")}\n\`\`\``,
          branchName,
          "main",
        );

        console.log("[Pipeline] PR Created:", pr.url);
        return { success: true, path, type, prUrl: pr.url, verified: true };
      }

      throw new Error("Unexpected State: Verification passed but PR logic skipped.");
    } catch (error: any) {
      console.error("[Pipeline] Generation Failed:", error);
      throw error;
    } finally {
      this.status = AgentStatus.IDLE;
    }
  }
}
