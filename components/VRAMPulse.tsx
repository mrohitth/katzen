"use client";

import { useEffect, useState } from "react";

interface ComputeApp {
  name: string;
  pid: number;
  memory: number; // KB
}

interface VRAMData {
  used: number;
  total: number;
  percentage: number;
  status: "healthy" | "warning" | "sleep" | "unavailable";
  temperature?: number;
  utilization?: number;
  computeApps?: ComputeApp[];
  isIdle: boolean;
}

export default function VRAMPulse() {
  const [vram, setVram] = useState<VRAMData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fetchVRAM = async () => {
      try {
        const res = await fetch("/api/vram");
        if (!res.ok) throw new Error("Failed");
        const data: VRAMData = await res.json();
        setVram(data);
        setVisible(true);
      } catch {
        setVram(null);
        setVisible(false);
      }
    };

    fetchVRAM();
    const interval = setInterval(fetchVRAM, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!visible || vram === null) return null;

  const {
    used, total, percentage, status,
    temperature, utilization, computeApps, isIdle,
  } = vram;

  const isSleep    = status === "sleep";
  const isWarning  = status === "warning";
  const isUnavailable = status === "unavailable";

  // Dim when GPU is idling — reduce visual clutter
  const wrapperOpacity = isSleep ? "opacity-20" : "opacity-100";
  const transitionClass = "transition-opacity duration-1000";

  const barColor = isWarning
    ? "bg-amber-500"
    : isUnavailable
    ? "bg-text-muted"
    : "bg-moss";

  const glowClass = isWarning ? "shadow-amber-500/40" : "shadow-moss/30";
  const primaryColor = isWarning ? "text-amber-400" : "text-moss";

  const topProcess = computeApps && computeApps.length > 0
    ? computeApps.reduce((a, b) => (a.memory > b.memory ? a : b)).name
    : null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1 ${transitionClass} ${wrapperOpacity}`}>
      {/* Label + temp row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-text-muted">VRAM</span>
        <span className={`text-xs font-mono ${primaryColor}`}>
          {percentage > 0 ? `${percentage}%` : "—"}
        </span>
        {temperature !== undefined && temperature > 0 && (
          <span className="text-xs font-mono text-text-muted">
            🌡 {temperature}°C
          </span>
        )}
        {isWarning && (
          <span className="text-xs font-mono text-amber-400 animate-pulse">⚠</span>
        )}
        {isSleep && (
          <span className="text-xs font-mono text-text-muted">💤</span>
        )}
      </div>

      {/* Gauge bar */}
      <div className="w-32 h-2 rounded-full bg-black/60 border border-terminal-green/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} ${
            isWarning ? "animate-pulse shadow-lg " + glowClass : "shadow-sm " + glowClass
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Detail row: MB + process */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-text-muted">
          {used} / {total} MB
        </span>
        {utilization !== undefined && utilization > 0 && (
          <span className="text-xs font-mono text-text-muted">
            ⚡{utilization}%
          </span>
        )}
        {topProcess && (
          <span
            className="text-xs font-mono text-violet/70"
            title={topProcess}
          >
            ⟪{topProcess.length > 12 ? topProcess.slice(0, 11) + "…" : topProcess}⟫
          </span>
        )}
      </div>

      {/* Multi-process tooltip (if > 1 active) */}
      {computeApps && computeApps.length > 1 && (
        <div className="text-xs font-mono text-text-muted/60 max-w-[12rem] truncate" title={
          computeApps.map((p) => `${p.name} (${p.memory}KB)`).join(" | ")
        }>
          {computeApps.length} processes
        </div>
      )}
    </div>
  );
}
