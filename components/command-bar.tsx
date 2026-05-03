"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, DollarSign, Target, Zap, Activity } from "lucide-react";

interface CommandBarProps {
  className?: string;
}

interface StatusData {
  // Tasks
  pendingCount: number;
  doneCount: number;
  topTask: { content: string; status: string } | null;
  // Scheduler
  nextRun: string | null;
  nextRunName: string | null;
  countdown: string | null;
  // Usage
  budgetUsed: number;
  budgetPercent: number;
  // Heartbeat
  heartbeatCount: number;
  incubatorProgress: number;
}

export default function CommandBar({ className = "" }: CommandBarProps) {
  const [data, setData] = useState<StatusData>({
    pendingCount: 0,
    doneCount: 0,
    topTask: null,
    nextRun: null,
    nextRunName: null,
    countdown: null,
    budgetUsed: 0,
    budgetPercent: 0,
    heartbeatCount: 0,
    incubatorProgress: 30,
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [tasksRes, schedulerRes, usageRes, heartbeatRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/scheduler"),
        fetch("/api/usage"),
        fetch("/api/heartbeat"),
      ]);

      const [tasks, scheduler, usage, heartbeat] = await Promise.all([
        tasksRes.json(),
        schedulerRes.json(),
        usageRes.json(),
        heartbeatRes.json(),
      ]);

      setData({
        pendingCount: tasks.pendingCount || 0,
        doneCount: tasks.doneCount || 0,
        topTask: tasks.topTask || null,
        nextRun: scheduler.nextRun || null,
        nextRunName: scheduler.nextRunName || null,
        countdown: null, // Will be calculated by useEffect
        budgetUsed: usage.today?.estimatedCost || 0,
        budgetPercent: usage.budget?.percentUsed || 0,
        heartbeatCount: heartbeat.heartbeatCount || 0,
        incubatorProgress: Math.min(95, heartbeat.incubatorProgress || 30),
      });
    } catch (e) {
      console.error("Failed to fetch command bar data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Countdown timer
  useEffect(() => {
    if (!data.nextRun) return;

    const updateCountdown = () => {
      const nextRun = new Date(data.nextRun!).getTime();
      const now = Date.now();
      const diff = nextRun - now;

      if (diff <= 0) {
        setData((prev) => ({ ...prev, countdown: "00:00" }));
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setData((prev) => ({
        ...prev,
        countdown: `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      }));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [data.nextRun]);

  return (
    <div className={`flex items-center gap-3 p-3 bg-obsidian-light border border-border rounded-xl ${className}`}>
      {/* Heartbeat Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian/50">
        <div className="relative">
          <Zap className="w-4 h-4 text-amber" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber animate-ping" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-mono">HEARTBEAT</span>
          <span className="text-sm text-text-primary font-mono">
            {data.countdown || "--:--"}
          </span>
        </div>
      </div>

      <div className="w-px h-8 bg-border" />

      {/* Budget Burn */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian/50">
        <DollarSign className="w-4 h-4 text-moss" />
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-mono">BURN</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-text-primary font-mono">
              ${data.budgetUsed.toFixed(2)}
            </span>
            <div className="w-12 h-1.5 bg-obsidian rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${data.budgetPercent > 80 ? "bg-amber" : "bg-moss"}`}
                style={{ width: `${Math.min(100, data.budgetPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-px h-8 bg-border" />

      {/* Task Stats with SLA */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian/50">
        <Activity className="w-4 h-4 text-violet" />
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-mono">TASKS</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-primary font-mono">
              {data.doneCount}/{data.pendingCount + data.doneCount}
            </span>
            {/* SLA Sparkline - velocity indicator */}
            <div className="flex items-end gap-0.5 h-4">
              {[60, 45, 80, 30, 55].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-moss/60 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-px h-8 bg-border" />

      {/* Focus Task */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian/50 flex-1 min-w-0">
        <Target className="w-4 h-4 text-amber flex-shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-text-muted font-mono">FOCUS</span>
          {data.topTask ? (
            <span className="text-sm text-text-primary font-mono truncate">
              {data.topTask.content}
            </span>
          ) : (
            <span className="text-sm text-text-muted italic">No pending tasks</span>
          )}
        </div>
      </div>

      {/* Incubation Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian/50">
        <div className="flex flex-col items-end">
          <span className="text-xs text-text-muted font-mono">INCUBATION</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-amber font-mono">{data.incubatorProgress}%</span>
            <div className="w-16 h-1.5 bg-obsidian rounded-full overflow-hidden">
              <div
                className="h-full bg-amber transition-all duration-1000"
                style={{ width: `${data.incubatorProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}