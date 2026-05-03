import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WORKSPACE = "/home/mathew/.openclaw/workspace";
const SESSIONS_DIR = "/home/mathew/.openclaw/agents/main/sessions";

function getSessionStartMs(): number {
  if (!fs.existsSync(SESSIONS_DIR)) return Date.now();

  const files = fs.readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".jsonl") && !f.includes("checkpoint") && !f.includes("bak"));
  if (files.length === 0) return Date.now();

  const stats = files.map((f) => ({
    file: f,
    ctime: fs.statSync(path.join(SESSIONS_DIR, f)).ctimeMs,
  }));
  stats.sort((a, b) => a.ctime - b.ctime);

  return stats[0].ctime;
}

function getTasksCompletedInSession(): number {
  const today = new Date().toISOString().split("T")[0];
  const logPath = path.join(WORKSPACE, "memory", `${today}.md`);
  if (!fs.existsSync(logPath)) return 0;

  const content = fs.readFileSync(logPath, "utf-8");
  const matches = content.matchAll(/- \[x\].+?\((20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\)/g);
  return [...matches].length;
}

function getIncubatorProgress(): number {
  const today = new Date().toISOString().split("T")[0];
  const logPath = path.join(WORKSPACE, "memory", `${today}.md`);
  if (!fs.existsSync(logPath)) return 0;

  const content = fs.readFileSync(logPath, "utf-8");
  const tittyActive = content.includes("[ARRIVAL] TITTY ACTIVATED");
  const bittyActive = content.includes("[ARRIVAL] BITTY ACTIVATED");
  const projectCount = (content.match(/\[PROJECT\]/g) || []).length;

  let progress = 20; // Base: Kitty initialized
  if (tittyActive) progress += 30;
  if (bittyActive) progress += 25;
  progress += Math.min(10, projectCount * 2);

  return Math.min(95, progress);
}

function getLastActivityMs(): number {
  if (!fs.existsSync(SESSIONS_DIR)) return Date.now();

  const files = fs.readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".jsonl") && !f.includes("checkpoint") && !f.includes("bak"))
    .map((f) => ({
      file: f,
      mtime: fs.statSync(path.join(SESSIONS_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? files[0].mtime : Date.now();
}

export async function GET() {
  try {
    const now = Date.now();
    const sessionStartMs = getSessionStartMs();
    const sessionAgeMs = now - sessionStartMs;
    const sessionAgeMinutes = sessionAgeMs / 60000;

    const heartbeatCount = getTasksCompletedInSession();
    const lastActivityMs = getLastActivityMs();
    const lastActivitySecondsAgo = Math.floor((now - lastActivityMs) / 1000);
    const incubatorProgress = getIncubatorProgress();

    // Next heartbeat = when the next 30-min cycle fires based on session start
    const heartbeatIntervalMs = 30 * 60 * 1000;
    const heartbeatsSinceSessionStart = Math.floor(sessionAgeMs / heartbeatIntervalMs);
    const nextHeartbeatMs = sessionStartMs + (heartbeatsSinceSessionStart + 1) * heartbeatIntervalMs;
    const nextHeartbeatInMs = Math.max(0, nextHeartbeatMs - now);

    const sessionAgeFormatted =
      sessionAgeMinutes >= 60
        ? `${Math.floor(sessionAgeMinutes / 60)}h ${Math.floor(sessionAgeMinutes % 60)}m`
        : `${Math.floor(sessionAgeMinutes)}m`;

    return NextResponse.json({
      heartbeatCount,
      sessionStart: new Date(sessionStartMs).toISOString(),
      sessionAgeMinutes: Math.floor(sessionAgeMinutes),
      sessionAgeFormatted,
      lastActivitySecondsAgo,
      nextHeartbeatIn: nextHeartbeatInMs,
      nextHeartbeatAt: new Date(nextHeartbeatMs).toISOString(),
      intervalMs: heartbeatIntervalMs,
      incubatorProgress,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json(
      {
        heartbeatCount: 0,
        intervalMs: 30 * 60 * 1000,
        nextHeartbeatIn: 30 * 60 * 1000,
        incubatorProgress: 30,
        error: "Failed to get heartbeat status",
      },
      { status: 500 }
    );
  }
}