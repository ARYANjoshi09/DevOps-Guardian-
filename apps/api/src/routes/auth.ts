import { Router, Request, Response } from "express";
import axios from "axios";
import { db } from "@devops-guardian/shared";

const router = Router();

const FRONTEND_URL = "http://localhost:3002/onboarding";

// 1. Redirect to GitHub
router.get("/github", (req, res) => {
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  console.log("[Auth] Initiating GitHub OAuth with Client ID:", CLIENT_ID);

  const redirectUri = "https://github.com/login/oauth/authorize";
  const scope = "repo workflow user"; // Read user + Write/Read Repo + Workflows
  const url = `${redirectUri}?client_id=${CLIENT_ID}&scope=${scope}`;
  res.redirect(url);
});

// 2. Callback
router.get("/github/callback", async (req: Request, res: Response): Promise<any> => {
  const code = req.query.code as string;
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return res.status(400).send("No code provided");
  }

  try {
    // Exchange Code for Token
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } },
    );

    const { access_token, error } = tokenRes.data;

    if (error || !access_token) {
      throw new Error(error || "No access token code");
    }

    console.log(`[Auth] GitHub Token Obtained: ${access_token.substring(0, 5)}...`);

    // In a real app: Create a session cookie logic here.
    // For this MVP: Redirect to frontend with token in query param
    res.redirect(`${FRONTEND_URL}?token=${access_token}`);
  } catch (error: any) {
    console.error("[Auth] Callback Failed:", error.message);
    res.status(500).send("Authentication Failed");
  }
});

export const authRouter = router;
