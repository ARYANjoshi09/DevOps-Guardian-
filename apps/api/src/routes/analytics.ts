import { Router } from "express";
import { db } from "@devops-guardian/shared";

export const analyticsRouter = Router();

// GET /analytics/mttr
analyticsRouter.get("/mttr", async (req, res) => {
  try {
    const incidents = await db.incident.findMany({
      where: { status: "RESOLVED" },
      select: {
        createdAt: true,
        metadata: true,
      },
    });

    if (incidents.length === 0) {
      return res.json({ average: 0, count: 0 });
    }

    const durations = incidents
      .map((i: any) => {
        const resolvedAt = (i.metadata as any)?.resolvedAt;
        if (!resolvedAt) return null;
        const resolved = new Date(resolvedAt);
        const duration = (resolved.getTime() - i.createdAt.getTime()) / 1000; // seconds
        return duration;
      })
      .filter((d: any) => d !== null);

    const avgMTTR =
      durations.length > 0
        ? durations.reduce((sum: any, d: any) => sum + d!, 0) / durations.length
        : 0;

    res.json({
      average: Math.round(avgMTTR),
      count: durations.length,
    });
  } catch (error) {
    console.error("[Analytics] MTTR error:", error);
    res.status(500).json({ error: "Failed to calculate MTTR" });
  }
});

// GET /analytics/severity-distribution
analyticsRouter.get("/severity-distribution", async (req, res) => {
  try {
    const distribution = await db.incident.groupBy({
      by: ["severity"],
      _count: true,
    });

    res.json({
      distribution: distribution.map((d: any) => ({
        severity: d.severity,
        count: d._count,
      })),
    });
  } catch (error) {
    console.error("[Analytics] Severity distribution error:", error);
    res.status(500).json({ error: "Failed to get severity distribution" });
  }
});

// GET /analytics/agent-performance
analyticsRouter.get("/agent-performance", async (req, res) => {
  try {
    const agentRuns = await db.agentRun.groupBy({
      by: ["agentName", "status"],
      _count: true,
    });

    const performance: Record<string, { completed: number; failed: number }> = {};

    agentRuns.forEach((run: any) => {
      if (!performance[run.agentName]) {
        performance[run.agentName] = { completed: 0, failed: 0 };
      }
      if (run.status === "COMPLETED") {
        performance[run.agentName].completed += run._count;
      } else if (run.status === "FAILED") {
        performance[run.agentName].failed += run._count;
      }
    });

    res.json({ performance });
  } catch (error) {
    console.error("[Analytics] Agent performance error:", error);
    res.status(500).json({ error: "Failed to get agent performance" });
  }
});

// GET /analytics/summary
analyticsRouter.get("/summary", async (req, res) => {
  try {
    const totalIncidents = await db.incident.count();
    const resolvedIncidents = await db.incident.count({
      where: { status: "RESOLVED" },
    });
    const criticalIncidents = await db.incident.count({
      where: { severity: "CRITICAL" },
    });

    // Get MTTR
    const incidents = await db.incident.findMany({
      where: { status: "RESOLVED" },
      select: { createdAt: true, metadata: true },
    });

    const durations = incidents
      .map((i: any) => {
        const resolvedAt = (i.metadata as any)?.resolvedAt;
        if (!resolvedAt) return null;
        const resolved = new Date(resolvedAt);
        return (resolved.getTime() - i.createdAt.getTime()) / 1000;
      })
      .filter((d: any) => d !== null);

    const avgMTTR =
      durations.length > 0
        ? Math.round(durations.reduce((sum: any, d: any) => sum + d!, 0) / durations.length)
        : 0;

    res.json({
      totalIncidents,
      resolvedIncidents,
      criticalIncidents,
      avgMTTR,
      successRate: totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0,
    });
  } catch (error) {
    console.error("[Analytics] Summary error:", error);
    res.status(500).json({ error: "Failed to get analytics summary" });
  }
});

// GET /analytics/incident-trend?days=7
analyticsRouter.get("/incident-trend", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const incidents = await db.incident.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by day
    const trendMap: Record<string, { date: string; total: number; resolved: number }> = {};

    incidents.forEach((incident: any) => {
      const day = incident.createdAt.toISOString().split("T")[0];
      if (!trendMap[day]) {
        trendMap[day] = { date: day, total: 0, resolved: 0 };
      }
      trendMap[day].total++;
      if (incident.status === "RESOLVED") {
        trendMap[day].resolved++;
      }
    });

    const trend = Object.values(trendMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    res.json({ trend });
  } catch (error) {
    console.error("[Analytics] Incident trend error:", error);
    res.status(500).json({ error: "Failed to get incident trend" });
  }
});

// GET /analytics/self-healing-stats
analyticsRouter.get("/self-healing-stats", async (req, res) => {
  try {
    // Get all resolved incidents with their agent runs
    const incidents = await db.incident.findMany({
      where: { status: "RESOLVED" },
      include: {
        agentRuns: {
          where: { agentName: "Verify" },
          orderBy: { startedAt: "asc" },
        },
      },
    });

    let firstPassSuccess = 0;
    let retriedSuccess = 0;
    let totalFailed = 0;

    incidents.forEach((incident: any) => {
      const verifyRuns = incident.agentRuns;
      if (verifyRuns.length === 1 && verifyRuns[0].status === "COMPLETED") {
        firstPassSuccess++;
      } else if (
        verifyRuns.length > 1 &&
        verifyRuns[verifyRuns.length - 1].status === "COMPLETED"
      ) {
        retriedSuccess++;
      } else {
        totalFailed++;
      }
    });

    const totalResolved = firstPassSuccess + retriedSuccess;
    const selfHealingRate =
      totalResolved > 0 ? Math.round((retriedSuccess / totalResolved) * 100) : 0;

    res.json({
      firstPassSuccess,
      retriedSuccess,
      totalFailed,
      selfHealingRate,
      totalResolved,
    });
  } catch (error) {
    console.error("[Analytics] Self-healing stats error:", error);
    res.status(500).json({ error: "Failed to get self-healing stats" });
  }
});

// GET /analytics/recent-activity?limit=5
analyticsRouter.get("/recent-activity", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const recentIncidents = await db.incident.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        createdAt: true,
        source: true,
        metadata: true,
      },
    });

    const activities = recentIncidents.map((incident: any) => {
      const metadata = incident.metadata as any;
      return {
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        timestamp: incident.createdAt,
        source: incident.source,
        repo: metadata?.owner && metadata?.repo ? `${metadata.owner}/${metadata.repo}` : "Unknown",
      };
    });

    res.json({ activities });
  } catch (error) {
    console.error("[Analytics] Recent activity error:", error);
    res.status(500).json({ error: "Failed to get recent activity" });
  }
});
