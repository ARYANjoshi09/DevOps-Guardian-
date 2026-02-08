"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { API_URL } from "@/lib/config";
import { Server, TrendingUp, Zap, RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [severity, setSeverity] = useState<any[]>([]);
  const [agentPerf, setAgentPerf] = useState<any>({});
  const [trend, setTrend] = useState<any[]>([]);
  const [selfHealing, setSelfHealing] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, severityRes, agentRes, trendRes, healingRes, activityRes] =
          await Promise.all([
            fetch(`${API_URL}/api/analytics/summary`),
            fetch(`${API_URL}/api/analytics/severity-distribution`),
            fetch(`${API_URL}/api/analytics/agent-performance`),
            fetch(`${API_URL}/api/analytics/incident-trend?days=7`),
            fetch(`${API_URL}/api/analytics/self-healing-stats`),
            fetch(`${API_URL}/api/analytics/recent-activity?limit=6`),
          ]);

        const summaryData = await summaryRes.json();
        const severityData = await severityRes.json();
        const agentData = await agentRes.json();
        const trendData = await trendRes.json();
        const healingData = await healingRes.json();
        const activityData = await activityRes.json();

        setSummary(summaryData);
        setSeverity(severityData.distribution || []);
        setAgentPerf(agentData.performance || {});
        setTrend(trendData.trend || []);
        setSelfHealing(healingData);
        setRecentActivity(activityData.activities || []);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: "#ef4444",
    WARNING: "#f59e0b",
    INFO: "#3b82f6",
  };

  // Transform agent performance data for chart
  const agentChartData = Object.entries(agentPerf).map(([name, stats]: [string, any]) => ({
    name,
    completed: stats.completed || 0,
    failed: stats.failed || 0,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg shadow-blue-500/20">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              DevOps Guardian
            </h1>
            <p className="text-zinc-400 text-sm">Real-Time SRE Analytics</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-zinc-800 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-all hover:scale-105 flex items-center gap-2"
          >
            📂 Projects
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)] animate-pulse" />
            <span className="text-xs font-medium text-green-400">System Online</span>
          </div>
        </div>
      </header>

      {/* Hero Summary Cards with Gradient */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <PremiumCard
          title="Total Incidents"
          value={summary?.totalIncidents || 0}
          icon={<TrendingUp className="w-6 h-6" />}
          gradient="from-blue-500 to-cyan-500"
          subtitle="All time"
        />
        <PremiumCard
          title="Resolution Rate"
          value={`${summary?.successRate || 0}%`}
          icon={<CheckCircle2 className="w-6 h-6" />}
          gradient="from-green-500 to-emerald-500"
          subtitle={`${summary?.resolvedIncidents || 0} resolved`}
        />
        <PremiumCard
          title="Mean Time to Resolve"
          value={summary?.avgMTTR ? `${summary.avgMTTR}s` : "N/A"}
          icon={<Zap className="w-6 h-6" />}
          gradient="from-purple-500 to-pink-500"
          subtitle="Average response"
        />
        <PremiumCard
          title="Self-Healing Rate"
          value={selfHealing ? `${selfHealing.selfHealingRate}%` : "0%"}
          icon={<RefreshCw className="w-6 h-6" />}
          gradient="from-orange-500 to-red-500"
          subtitle={`${selfHealing?.retriedSuccess || 0} retried fixes`}
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Incident Trend - Takes 2 columns */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">📈</span>
              Incident Trend (Last 7 Days)
            </h2>
            <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
              Live Data
            </span>
          </div>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                />
                <YAxis stroke="#71717a" />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ paddingTop: "10px" }} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                  name="Total Incidents"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorResolved)"
                  strokeWidth={2}
                  name="Resolved"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-zinc-500">
              No trend data available
            </div>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Severity Breakdown
          </h2>
          {severity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={severity}
                  dataKey="count"
                  nameKey="severity"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ severity, count }) => `${severity}: ${count}`}
                  labelLine={{ stroke: "#71717a" }}
                >
                  {severity.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-zinc-500">No data</div>
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Performance - Takes 2 columns */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            Agent Success Rates
          </h2>
          {agentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={agentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 12 }} />
                <YAxis stroke="#71717a" />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                <Bar dataKey="completed" fill="#22c55e" name="✓ Completed" radius={[8, 8, 0, 0]} />
                <Bar dataKey="failed" fill="#ef4444" name="✗ Failed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-500">
              No agent data
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Recent Activity
          </h2>
          <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            ) : (
              <p className="text-zinc-500 text-sm text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Key Insights Banner */}
      <div className="mt-6 p-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          SRE Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <InsightCard
            icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
            title="Autonomous Resolution"
            description={`${summary?.successRate || 0}% of incidents resolved without manual intervention`}
          />
          <InsightCard
            icon={<Zap className="w-5 h-5 text-yellow-500" />}
            title="Response Time"
            description={`${summary?.avgMTTR || 0}s average MTTR - ${summary?.avgMTTR < 120 ? "85% faster than industry" : "competitive with industry standards"}`}
          />
          <InsightCard
            icon={<RefreshCw className="w-5 h-5 text-purple-500" />}
            title="Self-Healing Loop"
            description={`${selfHealing?.retriedSuccess || 0} incidents auto-fixed after initial failure`}
          />
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #52525b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #71717a;
        }
      `}</style>
    </div>
  );
}

function PremiumCard({
  title,
  value,
  icon,
  gradient,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  subtitle?: string;
}) {
  return (
    <div className="group p-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 hover:border-zinc-700 transition-all hover:scale-105 backdrop-blur-sm">
      <div
        className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} text-white mb-4 shadow-lg`}
      >
        {icon}
      </div>
      <p className="text-sm font-medium text-zinc-400 mb-1">{title}</p>
      <p className="text-4xl font-bold mb-1 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
        {value}
      </p>
      {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
    </div>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const severityColors = {
    CRITICAL: "text-red-400 bg-red-500/10 border-red-500/20",
    WARNING: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    INFO: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  const statusColors = {
    RESOLVED: "text-green-400",
    OPEN: "text-yellow-400",
    CLOSED: "text-zinc-400",
  };

  return (
    <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900/80 transition-all">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-white line-clamp-1 flex-1">{activity.title}</p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[activity.severity as keyof typeof severityColors]}`}
        >
          {activity.severity}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{activity.repo}</span>
        <span className={statusColors[activity.status as keyof typeof statusColors]}>
          {activity.status}
        </span>
      </div>
      <p className="text-xs text-zinc-600 mt-1">
        {new Date(activity.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-white mb-1">{title}</p>
        <p className="text-zinc-400 text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
