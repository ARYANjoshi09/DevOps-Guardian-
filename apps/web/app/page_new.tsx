"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { API_URL } from "@/lib/config";
import { ArrowLeft, Activity, TrendingDown, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [severity, setSeverity] = useState<any[]>([]);
  const [agentPerf, setAgentPerf] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, severityRes, agentRes] = await Promise.all([
          fetch(`${API_URL}/api/analytics/summary`),
          fetch(`${API_URL}/api/analytics/severity-distribution`),
          fetch(`${API_URL}/api/analytics/agent-performance`),
        ]);

        const summaryData = await summaryRes.json();
        const severityData = await severityRes.json();
        const agentData = await agentRes.json();

        setSummary(summaryData);
        setSeverity(severityData.distribution || []);
        setAgentPerf(agentData.performance || {});
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
        <div className="text-zinc-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Analytics Dashboard
          </h1>
          <p className="text-zinc-400 text-sm mt-2">Real-time metrics and performance insights</p>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Total Incidents"
          value={summary?.totalIncidents || 0}
          icon="📊"
          color="blue"
        />
        <SummaryCard
          title="Resolved"
          value={summary?.resolvedIncidents || 0}
          subtitle={`${summary?.successRate || 0}% success rate`}
          icon="✅"
          color="green"
        />
        <SummaryCard
          title="Mean Time to Resolve"
          value={summary?.avgMTTR ? `${summary.avgMTTR}s` : "N/A"}
          icon="⚡"
          color="purple"
        />
        <SummaryCard
          title="Critical"
          value={summary?.criticalIncidents || 0}
          subtitle="Needs attention"
          icon="🚨"
          color="red"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📈</span>
            Severity Distribution
          </h2>
          {severity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={severity}
                  dataKey="count"
                  nameKey="severity"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry) => `${entry.severity}: ${entry.count}`}
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
            <div className="h-[250px] flex items-center justify-center text-zinc-500">
              No severity data available
            </div>
          )}
        </div>

        {/* Agent Performance */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30">
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
                <Bar dataKey="completed" fill="#22c55e" name="Completed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-500">
              No agent performance data available
            </div>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="mt-8 p-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-blue-500" />
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-white">Autonomous Resolution</p>
              <p className="text-zinc-400">
                {summary?.successRate || 0}% of incidents are resolved without manual intervention
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-white">Response Time</p>
              <p className="text-zinc-400">
                Average MTTR of {summary?.avgMTTR || 0}s - significantly faster than industry
                average
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: "blue" | "green" | "purple" | "red";
}) {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
    green: "from-green-500/10 to-green-600/5 border-green-500/20",
    purple: "from-purple-500/10 to-purple-600/5 border-purple-500/20",
    red: "from-red-500/10 to-red-600/5 border-red-500/20",
  };

  return (
    <div
      className={`p-6 rounded-2xl border bg-gradient-to-br ${colorClasses[color]} transition-transform hover:scale-105`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-4xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
    </div>
  );
}
