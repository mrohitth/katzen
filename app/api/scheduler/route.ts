import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CronJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  scheduleKind: string;
  timezone?: string;
  nextRun: string | null;
  nextRunMs: number | null;
  lastRun: string | null;
  status: "idle" | "active" | "disabled";
  sessionTarget: string;
  delivery: string;
}

const SESSIONS_DIR = "/home/mathew/.openclaw/agents/main/sessions";


const CRON_DESCRIPTIONS: Record<string, string> = {
  "Bitty Wiki Correction Monitor":
    "Bitty scans /wiki every 15 min for new docs contradicting Correction Ledger (Snowflake/Spark/Kafka/Snowflake mentions) — alerts to Telegram if found",
  "Mitty Security Audit \u2014 Daily 11 PM EST":
    "Mitty runs full security audit (SSH, firewall, updates, exposure) at 11 PM Eastern — logs findings to memory/YYYY-MM-DD.md",
  "Capital Pilot Daily Brief":
    "MarketBot delivers morning brief to Telegram: budget pacing, portfolio drift, market signals, profit scanner",
  "Kitty Heartbeat":
    "Kitty checks task status, market signals, budget burn — autonomous workspace health pulse every 30 min",
};


function describeJob(name: string): string {
  return CRON_DESCRIPTIONS[name] || "Cron job — see scheduler for details";
}

export async function GET() {
  try {
    let cronJobs: CronJob[] = [];
    let rawOutput = "";

    try {
      rawOutput = execSync("openclaw cron list --json 2>/dev/null", {
        encoding: "utf-8",
        timeout: 5000,
        maxBuffer: 64 * 1024,
      });
    } catch {
      rawOutput = "";
    }

    if (rawOutput) {
      try {
        const parsed = JSON.parse(rawOutput);
        const jobs = parsed.jobs || [];
        cronJobs = jobs.map((j: any) => ({
          id: j.id || "",
          name: j.name || "Unnamed",
          description: describeJob(j.name || ""),
          schedule: j.schedule?.expr || j.schedule?.everyMs ? JSON.stringify(j.schedule) : "unknown",
          scheduleKind: j.schedule?.kind || "unknown",
          timezone: j.schedule?.tz,
          nextRun: j.state?.nextRunAtMs ? new Date(j.state.nextRunAtMs).toISOString() : null,
          nextRunMs: j.state?.nextRunAtMs || null,
          lastRun: j.state?.lastRunAtMs ? new Date(j.state.lastRunAtMs).toISOString() : null,
          status: j.enabled === false ? "disabled" : "idle",
          sessionTarget: j.sessionTarget || "",
          delivery: parsed.deliveryPreviews?.[j.id]?.label || "",
        }));
      } catch {
        cronJobs = [];
      }
    }

    const now = Date.now();

    // Find the soonest next run
    const activeJobs = cronJobs
      .filter((j) => j.status !== "disabled" && j.nextRunMs)
      .sort((a, b) => (a.nextRunMs || Infinity) - (b.nextRunMs || Infinity));

    const nextRunJob = activeJobs[0] || null;

    // If no cron jobs configured, show heartbeat based on session start
    if (cronJobs.length === 0) {
      let sessionStartMs = now;
      try {
        if (fs.existsSync(SESSIONS_DIR)) {
          const files = fs.readdirSync(SESSIONS_DIR)
            .filter((f) => f.endsWith(".jsonl") && !f.includes("checkpoint") && !f.includes("bak"))
            .map((f) => ({ file: f, ctime: fs.statSync(path.join(SESSIONS_DIR, f)).ctimeMs }))
            .sort((a, b) => a.ctime - b.ctime);
          if (files.length > 0) sessionStartMs = files[0].ctime;
        }
      } catch { /* use now */ }

      const heartbeatIntervalMs = 30 * 60 * 1000;
      const elapsed = now - sessionStartMs;
      const heartbeatsElapsed = Math.floor(elapsed / heartbeatIntervalMs);
      const nextHeartbeatMs = sessionStartMs + (heartbeatsElapsed + 1) * heartbeatIntervalMs;

      const heartbeatJob: CronJob = {
        id: "heartbeat",
        name: "Kitty Heartbeat",
        description: describeJob("Kitty Heartbeat"),
        schedule: "*/30 * * * *",
        scheduleKind: "cron",
        nextRun: new Date(nextHeartbeatMs).toISOString(),
        nextRunMs: nextHeartbeatMs,
        lastRun: null,
        status: "active",
        sessionTarget: "isolated",
        delivery: "systemEvent",
      };

      return NextResponse.json({
        jobs: [heartbeatJob],
        nextRun: heartbeatJob.nextRun,
        nextRunName: heartbeatJob.name,
        nextRunMs: heartbeatJob.nextRunMs,
        source: "session-based",
      });
    }

    return NextResponse.json({
      jobs: cronJobs,
      nextRun: nextRunJob?.nextRun || null,
      nextRunName: nextRunJob?.name || null,
      nextRunMs: nextRunJob?.nextRunMs || null,
      source: "openclaw",
    });
  } catch (error) {
    console.error("Scheduler fetch error:", error);
    return NextResponse.json(
      { jobs: [], nextRun: null, nextRunName: null, error: "Failed to fetch scheduler" },
      { status: 500 }
    );
  }
}