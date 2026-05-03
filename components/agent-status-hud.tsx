"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Target } from "lucide-react";

interface TopTask {
  content: string;
  status: string;
}

interface HUDData {
  heartbeatCount: number;
  incubatorProgress: number;
  countdown: string | null;
  topTask: TopTask | null;
}

export default function AgentStatusHUD() {
  const [data, setData] = useState<HUDData>({
    heartbeatCount: 0,
    incubatorProgress: 30,
    countdown: null,
    topTask: null,
  });
  const [pulseActive, setPulseActive] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schedulerRes, heartbeatRes, tasksRes] = await Promise.all([
          fetch("/api/scheduler"),
          fetch("/api/heartbeat"),
          fetch("/api/tasks"),
        ]);

        const scheduler = await schedulerRes.json();
        const heartbeat = await heartbeatRes.json();
        const tasks = await tasksRes.json();

        setData({
          heartbeatCount: heartbeat.heartbeatCount || 0,
          incubatorProgress: Math.min(95, heartbeat.incubatorProgress || 30),
          countdown: scheduler.nextRunAt
            ? null // Let the timer handle it
            : null,
          topTask: tasks.topTask || null,
        });
      } catch (e) {
        console.error("Failed to fetch HUD data:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Countdown timer from scheduler
  useEffect(() => {
    const now = Date.now();
    const nextRun = now + 30 * 60 * 1000; // 30 min assumption
    const update = () => {
      const diff = nextRun - Date.now();
      if (diff <= 0) {
        setData((prev) => ({ ...prev, countdown: "00:00" }));
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setData((prev) => ({ ...prev, countdown: `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}` }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Kitty Pulse */}
      <div className="relative flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-moss animate-ping" />
        <Badge variant="secondary" className="bg-moss/10 text-moss border-moss/20 font-mono text-xs px-2 py-0.5">
          KITTY
        </Badge>
      </div>

      {/* Heartbeat Timer */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-3 h-3 text-text-muted" />
        <span className="text-xs font-mono text-text-muted">
          {data.countdown || "--:--"}
        </span>
      </div>

      {/* Incubation Progress */}
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-amber" />
        <span className="text-xs font-mono text-text-muted">
          T:{data.incubatorProgress}%
        </span>
      </div>

      {/* Active Mission - Top Pending Task with amber pulse */}
      <div className="flex items-center gap-1.5">
        {data.topTask ? (
          <>
            <div className="relative">
              <Target className="w-3 h-3 text-amber" />
              <div className="absolute inset-0 animate-ping opacity-50">
                <div className="w-3 h-3 rounded-full bg-amber" />
              </div>
            </div>
            <span className="text-xs font-mono text-amber max-w-[180px] truncate" title={data.topTask.content}>
              {data.topTask.content}
            </span>
          </>
        ) : (
          <span className="text-xs font-mono text-text-muted italic">No active mission</span>
        )}
      </div>
    </div>
  );
}