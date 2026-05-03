"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, DollarSign, Target, Zap, Activity, Wifi, WifiOff } from "lucide-react";

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
  nextRunMs: number | null;
  countdown: string | null;
  // Usage (MiniMax live)
  mxnAvailable: boolean;
  mxnModel: string | null;
  mxnUsed: number;
  mxnTotal: number;
  mxnPercent: number;
  mxnWindowResetMs: number | null;
  // Token burn from sessions
  tokenBurn: number;
  burnPercent: number;
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
    nextRunMs: null,
    countdown: null,
    mxnAvailable: false,
    mxnModel: null,
    mxnUsed: 0,
    mxnTotal: 0,
    mxnPercent: 0,
    mxnWindowResetMs: null,
    tokenBurn: 0,
    burnPercent: 0,
    heartbeatCount: 0,
    incubatorProgress: 30,
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [tasksRes, schedulerRes, usageRes, heartbeatRes, mxnRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/scheduler"),
        fetch("/api/usage"),
        fetch("/api/heartbeat"),
        fetch("/api/usage/minimax"),
      ]);

      const [tasks, scheduler, usage, heartbeat, mxn] = await Promise.all([
        tasksRes.json(),
        schedulerRes.json(),
        usageRes.json(),
        heartbeatRes.json(),
        mxnRes.json(),
      ]);

      // Parse MiniMax usage
      const mxnSummary = mxn.summary || null;
      const firstModel = mxn.models?.[0];

      setData((prev) => ({
        pendingCount: tasks.pendingCount || 0,
        doneCount: tasks.doneCount || 0,
        topTask: tasks.topTask || null,
        nextRun: scheduler.nextRun || null,
        nextRunName: scheduler.nextRunName || null,
        nextRunMs: scheduler.nextRunMs || null,
        countdown: null,
        mxnAvailable: mxn.available === true,
        mxnModel: firstModel?.name || null,
        mxnUsed: mxnSummary?.totalUsedPrompts || firstModel?.usedPrompts || 0,
        mxnTotal: mxnSummary?.totalAllPrompts || firstModel?.totalPrompts || 0,
        mxnPercent: mxnSummary?.overallUsagePercent || firstModel?.usagePercent || 0,
        mxnWindowResetMs: mxnSummary?.nextWindowResetInMs || firstModel?.windowResetsInMs || null,
        tokenBurn: usage.today?.estimatedCost || 0,
        burnPercent: usage.budget?.percentUsed || 0,
        heartbeatCount: heartbeat.heartbeatCount || 0,
        incubatorProgress: Math.min(95, heartbeat.incubatorProgress || 30),
      }));
    } catch (e) {
      console.error("Failed to fetch command bar data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Countdown timer
  useEffect(() => {
    if (!data.nextRunMs && !data.nextRun) return;

    const tick = () => {
      const ms = data.nextRunMs || new Date(data.nextRun!).getTime();
      const now = Date.now();
      const diff = ms - now;
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

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data.nextRunMs, data.nextRun]);

  // MiniMax window reset countdown
  const [mxnResetCountdown, setMxnResetCountdown] = useState<string | null>(null);
  useEffect(() => {
    if (!data.mxnWindowResetMs) {
      setMxnResetCountdown(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, data.mxnWindowResetMs! - Date.now());
      if (remaining === 0) {
        setMxnResetCountdown("RESET NOW");
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setMxnResetCountdown(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data.mxnWindowResetMs]);

  // Color for usage bar
  const mxnColor = data.mxnPercent > 85 ? "bg-red-500" : data.mxnPercent > 60 ? "bg-amber" : "bg-moss";
  const burnColor = data.burnPercent > 80 ? "bg-amber" : "bg-moss";

  return (
    <div className={`flex items-center gap-3 p-3 bg-obsidian-light border border-border rounded-xl ${className}`}>
      {/* Heartbeat */}
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
        {data.nextRunName && (
          <span className="text-xs text-text-muted/60 font-mono ml-1 hidden sm:inline truncate max-w-24">
            {data.nextRunName}
          </span>
        )}
      </div>

      <div className="w-px h-8 bg-border" />

      {/* MiniMax Usage */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian/50">
        {data.mxnAvailable ? (
          <Wifi className="w-4 h-4 text-moss flex-shrink-0" />
        ) : (
          <WifiOff className="w-4 h-4 text-text-muted/50 flex-shrink-0" />
        )}
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-mono">MINIMAX</span>
          {data.mxnAvailable ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-text-primary font-mono">
                  {data.mxnModel ? data.mxnModel.slice(0, 10) : "M2.7"}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  {data.mxnUsed}/{data.mxnTotal}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-obsidian rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${mxnColor}`}
                    style={{ width: `${Math.min(100, data.mxnPercent)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-text-muted/70">
                  {data.mxnPercent}%
                </span>
              </div>
              {mxnResetCountdown && (
                <span className="text-xs text-text-muted/60 font-mono">
                  ↻ {mxnResetCountdown}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-text-muted font-mono">unavailable</span>
          )}
        </div>
      </div>

      <div className="w-px h-8 bg-border" />

      {/* Token Burn */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian/50">
        <DollarSign className="w-4 h-4 text-moss" />
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-mono">BURN</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-text-primary font-mono">
              ${data.tokenBurn.toFixed(2)}
            </span>
            <div className="w-12 h-1.5 bg-obsidian rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${burnColor}`}
                style={{ width: `${Math.min(100, data.burnPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-px h-8 bg-border" />

      {/* Task Stats */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian/50">
        <Activity className="w-4 h-4 text-violet" />
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-mono">TASKS</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-primary font-mono">
              {data.doneCount}/{data.pendingCount + data.doneCount}
            </span>
            <div className="flex items-end gap-0.5 h-4">
              {[60, 45, 80, 30, 55].map((h, i) => (
                <div key={i} className="w-1 bg-moss/60 rounded-t" style={{ height: `${h}%` }} />
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

      {/* Incubation */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian/50">
        <div className="flex flex-col items-end">
          <span className="text-xs text-text-muted font-mono">INCUB</span>
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