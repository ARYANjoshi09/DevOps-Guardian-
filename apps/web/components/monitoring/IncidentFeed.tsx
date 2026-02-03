"use client";

import { useEffect, useState } from "react";
import { socketService } from "@/lib/socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertTriangle, GitPullRequest, Loader2 } from "lucide-react";
import Link from "next/link";

interface Incident {
  id: string;
  title: string;
  status: string;
  statusMessage?: string;
  prUrl?: string;
  timestamp: string;
}

export function IncidentFeed() {
  const [incidents, setIncidents] = useState<IncomingIncident[]>([]);

  useEffect(() => {
    const socket = socketService.connect();

    // Initial fetch
    fetch("http://localhost:3001/incidents")
      .then((res) => res.json())
      .then((data) => {
        if (data.incidents) setIncidents(data.incidents);
      })
      .catch((e) => console.error("Failed to fetch initial incidents", e));

    const handleUpdate = (updatedIncident: any) => {
      setIncidents((prev) => {
        const exists = prev.find((i) => i.id === updatedIncident.id);
        if (exists) {
          return prev.map((i) => (i.id === updatedIncident.id ? { ...i, ...updatedIncident } : i));
        }
        return [updatedIncident, ...prev];
      });
    };

    socket.on("incident:update", handleUpdate);
    // Also listen for creation (orchestrator emits same event name for simplicity in our impl,
    // but ideally we separate created/updated. In ours, update handles both merge/push)

    return () => {
      socket.off("incident:update", handleUpdate);
    };
  }, []);

  return (
    <Card className="h-full border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Active Incidents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {incidents.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No active incidents. System healthy.
            </div>
          )}
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="group flex flex-col gap-2 rounded-lg border p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm">{incident.title}</h4>
                  <p className="text-xs text-slate-500">
                    {new Date(incident.timestamp).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={incident.status} />
              </div>

              {/* Progress Bar / Status Message */}
              <div className="mt-2 text-xs bg-slate-100 dark:bg-slate-950 p-2 rounded flex items-center justify-between">
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {incident.statusMessage || "Processing..."}
                </span>
                {isWorking(incident.status) && (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                )}
              </div>

              {/* PR Link */}
              {incident.prUrl && (
                <Link
                  href={incident.prUrl}
                  target="_blank"
                  className="mt-1 flex items-center gap-2 text-xs font-medium text-blue-600 hover:underline"
                >
                  <GitPullRequest className="h-3 w-3" />
                  View Pull Request
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status = "UNKNOWN" }: { status?: string }) {
  if (status === "RESOLVED")
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Resolved
      </Badge>
    );
  if (status === "AWAITING_APPROVAL")
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200">
        <AlertTriangle className="mr-1 h-3 w-3" /> Approval Needed
      </Badge>
    );

  return (
    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
      <Loader2 className="mr-1 h-3 w-3 animate-spin" /> {status.replace(/_/g, " ")}
    </Badge>
  );
}

function isWorking(status: string) {
  return status !== "RESOLVED" && status !== "AWAITING_APPROVAL" && status !== "FAILED";
}

type IncomingIncident = Incident;
