"use client";

import { useEffect, useState, useRef } from "react";
import { socketService } from "@/lib/socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
  projectId: string;
  log: string;
  timestamp: string;
}

export function LiveLogStream({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = socketService.connect();

    const handleLog = (data: any) => {
      // Filter by project for now (client-side fitering)
      // optimization: implement rooms on backend
      if (data.projectId === projectId || projectId === "all") {
        setLogs((prev) => [...prev.slice(-49), data]); // Keep last 50 logs
      }
    };

    socket.on("log:received", handleLog);

    return () => {
      socket.off("log:received", handleLog);
    };
  }, [projectId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className="h-[400px] flex flex-col bg-slate-950 border-slate-800">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono text-slate-400">Live Log Stream</CardTitle>
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-500 border-green-500/20 text-xs animate-pulse"
          >
            LIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden relative">
        <div className="absolute inset-0 p-4 overflow-y-auto font-mono text-xs" ref={scrollRef}>
          <div className="space-y-1">
            {logs.length === 0 && (
              <div className="text-slate-600 italic">Waiting for incoming logs...</div>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-500 shrink-0 select-none">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`${
                    entry.log.toLowerCase().includes("error") ? "text-red-400" : "text-slate-300"
                  } break-all whitespace-pre-wrap`}
                >
                  {entry.log}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
