import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const AGENTS_DIR = process.env.OPENCLAW_AGENTS_DIR || "/home/mathew/.openclaw/agents";
const ROLLING_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    const sessionsFile = path.join(AGENTS_DIR, "main", "sessions", "sessions.json");
    if (!fs.existsSync(sessionsFile)) {
      return NextResponse.json({ sessions: [], totalInputTokens: 0 });
    }

    const data = JSON.parse(fs.readFileSync(sessionsFile, "utf-8"));
    const now = Date.now();
    const windowStart = now - ROLLING_WINDOW_MS;
    const sessions: any[] = [];

    for (const [key, session] of Object.entries(data)) {
      const sess = session as any;
      const updatedAt = sess.updatedAt || 0;
      const startedAt = sess.sessionStartedAt || 0;

      // Only include sessions active within the rolling window
      if (updatedAt < windowStart) continue;

      // Include the session if it has token usage data
      const inputTokens = sess.inputTokens || 0;
      if (inputTokens === 0) continue;

      sessions.push({
        key,
        sessionId: sess.sessionId?.slice(0, 8) || "unknown",
        inputTokens,
        outputTokens: sess.outputTokens || 0,
        estimatedCostUsd: sess.estimatedCostUsd || 0,
        lastUpdated: new Date(updatedAt).toISOString(),
        ageMs: now - startedAt,
      });
    }

    // Sort by input tokens descending
    sessions.sort((a, b) => b.inputTokens - a.inputTokens);

    const totalInputTokens = sessions.reduce((sum, s) => sum + s.inputTokens, 0);

    return NextResponse.json({
      sessions,
      totalInputTokens,
      windowStart: new Date(windowStart).toISOString(),
      now: new Date(now).toISOString(),
    });
  } catch (error) {
    console.error("Session usage error:", error);
    return NextResponse.json({ error: "Failed to fetch session usage" }, { status: 500 });
  }
}
