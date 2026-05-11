import { NextResponse } from "next/server";
import { getVRAM, WARNING_THRESHOLD, TEMP_THRESHOLD, IDLE_THRESHOLD, PEAK_THRESHOLD } from "@/lib/vram_service";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

const STATE_FILE = "/home/mathew/.cache/vram_monitor_state.json";
const MANIFEST   = "/home/mathew/katzen/src/data/manifest.json";
const MAX_ALERTS = 50;

interface AlertEntry {
  id: string;
  agent: string;
  severity: "info" | "warning" | "critical";
  type: string;
  status_code: string;
  message: string;
  timestamp: string;
  source: string;
  model?: string;
}

/** Read existing alerts from manifest */
function getAlerts(): AlertEntry[] {
  try {
    if (!existsSync(MANIFEST)) return [];
    const m = JSON.parse(readFileSync(MANIFEST, "utf-8"));
    return Array.isArray(m.alerts_history) ? m.alerts_history : [];
  } catch { return []; }
}

/** Write alerts back to manifest */
function putAlerts(alerts: AlertEntry[]) {
  try {
    const m = JSON.parse(readFileSync(MANIFEST, "utf-8"));
    m.alerts_history = alerts;
    writeFileSync(MANIFEST, JSON.stringify(m, null, 2), "utf-8");
  } catch { /* non-fatal */ }
}

/** EDT timestamp */
function tsEdt(): string {
  const now = new Date();
  return now.toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).replace("/", "-").replace("/", "-") + " EDT";
}

/** Append an alert to manifest.json (deduped within 5 min) */
function appendAlert(entry: AlertEntry) {
  const alerts = getAlerts();
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const isDup = alerts.some(
    (a) => a.agent === entry.agent
      && a.status_code === entry.status_code
      && a.message === entry.message
      && new Date(a.timestamp).getTime() > fiveMinAgo
  );
  if (isDup) return;

  if (alerts.length >= MAX_ALERTS) {
    // Archive oldest 10
    const archive = alerts.slice(0, 10);
    alerts.splice(0, 10);
    const archiveDir = "/home/mathew/.openclaw/workspace/wiki/logs/archive";
    const archiveFile = join(archiveDir, `alerts_May2026.md`);
    const existing = existsSync(archiveFile)
      ? readFileSync(archiveFile, "utf-8")
      : "# Archived Alerts\n\n";
    const rows = archive.map(
      (a) => `| ${a.timestamp} | ${a.agent} | ${a.status_code} | ${a.severity} | ${a.message} |`
    ).join("\n");
    writeFileSync(archiveFile, existing + `\n|---|---|---|---|---|\n${rows}\n`, "utf-8");
  }

  alerts.push(entry);
  putAlerts(alerts);
}

export const dynamic = "force-dynamic";

export async function GET() {
  const vram = await getVRAM();

  if (!vram) {
    return NextResponse.json({
      used: 0, total: 0, percentage: 0,
      status: "unavailable",
      isIdle: false,
    });
  }

  // --- Fiscal Guardrail: server-side only, zero LLM tokens ---
  // Only fire an alert event on a meaningful state change (peak or thermal)
  if (!vram.isIdle) {
    const alerts = getAlerts();
    const lastAlert = alerts[alerts.length - 1];
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const noRecent = !lastAlert
      || new Date(lastAlert.timestamp).getTime() < fiveMinAgo
      || lastAlert.status_code !== "VRAM_PEAK";

    if (vram.percentage > PEAK_THRESHOLD && noRecent) {
      appendAlert({
        id: `vram-${Date.now()}`,
        agent: "MITTY",
        severity: vram.temperature && vram.temperature > TEMP_THRESHOLD ? "warning" : "info",
        type: "system",
        status_code: "VRAM_PEAK",
        message: `VRAM usage peaked at ${vram.percentage}% — ${vram.computeApps?.length ?? 0} compute app(s) active`,
        timestamp: tsEdt(),
        source: "vram_monitor",
      });
    }
  }

  // Thermal — always fire on new threshold breach
  if (vram.temperature && vram.temperature > TEMP_THRESHOLD) {
    appendAlert({
      id: `thermal-${Date.now()}`,
      agent: "MITTY",
      severity: "warning",
      type: "system",
      status_code: "THERMAL_WARN",
      message: `GPU thermal warning: ${vram.temperature}°C (threshold ${TEMP_THRESHOLD}°C)`,
      timestamp: tsEdt(),
      source: "vram_monitor",
    });
  }

  return NextResponse.json(vram);
}
