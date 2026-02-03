import { Router, Request, Response } from "express";
import { db } from "@devops-guardian/shared";

const router = Router();

// GET /api/projects - List all projects
router.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json({ projects });
  } catch (error: any) {
    console.error("[Projects] Failed to list projects:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id - Get specific project
router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const project = await db.project.findUnique({
      where: { id },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    return res.json({ project });
  } catch (error: any) {
    console.error("[Projects] Failed to get project:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/projects - Create a new project
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, githubRepo, githubToken } = req.body;

    if (!name || !githubRepo) {
      return res.status(400).json({ error: "name and githubRepo are required" });
    }

    const project = await db.project.create({
      data: {
        name,
        githubRepo,
        githubToken: githubToken || null,
      },
    });

    return res.status(201).json({ project });
  } catch (error: any) {
    console.error("[Projects] Failed to create project:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

export const projectsRouter = router;
