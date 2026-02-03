import { Router, Request, Response } from "express";
import { db, GitHubService } from "@devops-guardian/shared";
import { PipelineAgent } from "../agents/pipeline";

const router = Router();

// POST /api/onboarding/repos - List repositories for a token
router.post("/repos", async (req: Request, res: Response): Promise<any> => {
  try {
    const { githubToken } = req.body;
    if (!githubToken) return res.status(400).json({ error: "Missing token" });

    const gh = new GitHubService(githubToken);
    const repos = await gh.getUserRepositories();

    return res.json({ repos });
  } catch (error: any) {
    console.error("[Onboarding] Failed to list repos:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/onboarding/analyze - Check for pipelines
router.post("/analyze", async (req: Request, res: Response): Promise<any> => {
  try {
    const { githubRepo, githubToken } = req.body;
    if (!githubRepo || !githubToken)
      return res.status(400).json({ error: "Missing repo or token" });

    const [owner, repo] = githubRepo.split("/");
    const agent = new PipelineAgent(githubToken);
    const result = await agent.analyze(owner, repo);

    return res.json({ result });
  } catch (error: any) {
    console.error("[Onboarding] Analysis Failed:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/onboarding/pipeline - Create new pipeline
router.post("/pipeline", async (req: Request, res: Response): Promise<any> => {
  try {
    const { githubRepo, githubToken, type, env } = req.body;
    if (!githubRepo || !githubToken || !type)
      return res.status(400).json({ error: "Missing required fields" });

    const [owner, repo] = githubRepo.split("/");
    const agent = new PipelineAgent(githubToken);
    const result = await agent.generatePipeline(owner, repo, type, env);

    return res.json({ result });
  } catch (error: any) {
    console.error("[Onboarding] Pipeline Creation Failed:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/onboarding/connect
router.post("/connect", async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, githubRepo, githubToken } = req.body;

    if (!name || !githubRepo || !githubToken) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Validate Token with GitHub
    const gh = new GitHubService(githubToken);
    const user = await gh.getAuthenticatedUser();
    console.log(`[Onboarding] Token Validated for User: ${user.login}`);

    // 2. Save Project
    const project = await db.project.create({
      data: {
        name,
        githubRepo, // "facebook/react"
        githubToken, // Ideally, encrypt this!
      },
    });

    console.log(`[Onboarding] Project Created: ${project.id}`);

    return res.json({ success: true, project });
  } catch (error: any) {
    console.error("[Onboarding] Failed:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

export const onboardingRouter = router;
