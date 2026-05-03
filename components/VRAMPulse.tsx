"use client";

import { useEffect, useState } from "react";

interface VRAMData {
  used: number;
  total: number;
  percentage: number;
  status: "healthy" | "warning" | "unavailable";
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

  const { used, total, percentage, status } = vram;
  const isWarning = status === "warning";
  const isUnavailable = status === "unavailable";

  const barColor = isWarning
    ? "bg-amber-500"
    : isUnavailable
    ? "bg-text-muted"
    : "bg-moss";

  const glowClass = isWarning ? "shadow-amber-500/40" : "shadow-moss/30";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-text-muted">
          VRAM
        </span>
        <span
          className={`text-xs font-mono ${
            isWarning ? "text-amber-400" : "text-moss"
          }`}
        >
          {percentage > 0 ? `${percentage}%` : "—"}
        </span>
        {isWarning && (
          <span className="text-xs font-mono text-amber-400 animate-pulse">
            ⚠
          </span>
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

      {/* Detail row */}
      <span className="text-xs font-mono text-text-muted">
        {used} / {total} MB
      </span>
    </div>
  );
}