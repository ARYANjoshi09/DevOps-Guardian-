import { Sandbox } from "@e2b/code-interpreter";

export class VerificationService {
  /**
   * Runs a verification build in an E2B sandbox.
   *
   * @param repoUrl Full URL to the repo (e.g. https://github.com/user/repo)
   * @param envs Environment variables to inject
   * @param branch Branch to checkout (optional, defaults to main/master)
   */
  async verifyBuild(
    repoUrl: string,
    envs: Record<string, string>,
    token?: string,
    branch: string = "main",
  ) {
    console.log(`[Verification] Starting sandbox for ${repoUrl}...`);

    // In a real implementation, we would pass the apiKey via constructor or env
    // process.env.E2B_API_KEY must be set.

    let sandbox: Sandbox | null = null;
    const logs: string[] = [];

    try {
      sandbox = await Sandbox.create();
      console.log(`[Verification] Sandbox created: ${(sandbox as any).id}`);

      // 1. Clone Repo (Authenticated)
      // Construct auth URL: https://x-access-token:<TOKEN>@github.com/user/repo
      let cloneUrl = repoUrl;
      if (token && repoUrl.startsWith("https://github.com/")) {
        const suffix = repoUrl.substring(19); // remove https://github.com/
        cloneUrl = `https://x-access-token:${token}@github.com/${suffix}`;
      }

      console.log(`[Verification] Cloning repository...`);
      const cloneCmd = await sandbox.commands.run(`git clone ${cloneUrl} /home/user/repo`);

      if (cloneCmd.exitCode !== 0) throw new Error(`Clone failed: ${cloneCmd.stderr}`);
      logs.push("Cloned repository successfully.");

      // 2. Detect Project Type & Install Dependencies
      const checkPackageJson = await sandbox.commands.run(
        `[ -f /home/user/repo/package.json ] && echo "exists" || echo "missing"`,
      );
      const isNode = checkPackageJson.stdout.trim() === "exists";

      if (isNode) {
        logs.push("Node.js project detected. Installing dependencies...");
        const installCmd = await sandbox.commands.run(`
              cd /home/user/repo
              npm install
          `);
        if (installCmd.exitCode !== 0) throw new Error(`Install failed: ${installCmd.stderr}`);
        logs.push("Dependencies installed.");

        // 3. Run Build/Test with Envs
        const envExports = Object.entries(envs)
          .map(([k, v]) => `export ${k}="${v}"`)
          .join("\n");

        logs.push("Running verification build...");
        const buildCmd = await sandbox.commands.run(`
              cd /home/user/repo
              ${envExports}
              npm run build
          `);

        if (buildCmd.exitCode !== 0) {
          logs.push(`Build Failed: ${buildCmd.stderr}`);
          return { success: false, logs };
        }
      } else {
        logs.push("Non-Node project detected (no package.json). Verifying structure...");
        const lsCmd = await sandbox.commands.run(`ls -R /home/user/repo`);
        if (lsCmd.exitCode !== 0) throw new Error(`Structure check failed: ${lsCmd.stderr}`);
        logs.push("Repository structure verified.");
      }

      logs.push("Verification Passed!");
      return { success: true, logs };
    } catch (error: any) {
      console.error("[Verification] Error:", error);
      logs.push(`System Error: ${error.message}`);
      return { success: false, logs };
    } finally {
      if (sandbox) {
        await sandbox.kill();
        console.log("[Verification] Sandbox closed.");
      }
    }
  }
}
