"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export default function AgentStatusHUD() {
  const [heartbeatCount, setHeartbeatCount] = useState(0);
  const [incubatorProgress, setIncubatorProgress] = useState(30);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [pulseActive, setPulseActive] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schedulerRes, heartbeatRes] = await Promise.all([
          fetch("/api/scheduler"),
          fetch("/api/heartbeat"),
        ]);

        const scheduler = await schedulerRes.json();
        const heartbeat = await heartbeatRes.json();

        setHeartbeatCount(heartbeat.heartbeatCount || 0);
        setIncubatorProgress(Math.min(95, heartbeat.incubatorProgress || 30));
      } catch (e) {
        console.error("Failed to fetch HUD data:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Countdown
  useEffect(() => {
    const now = Date.now();
    const nextRun = now + 30 * 60 * 1000; // Assume 30 min
    const update = () => {
      const diff = nextRun - Date.now();
      if (diff <= 0) {
        setCountdown("00:00");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
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
          {countdown || "--:--"}
        </span>
      </div>

      {/* Incubation Progress */}
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-amber" />
        <span className="text-xs font-mono text-text-muted">
          T:{incubatorProgress}% B:{heartbeatCount > 0 ? Math.min(100, (heartbeatCount % 10) * 10) : 0}%
        </span>
      </div>
    </div>
  );
}