import { NextResponse } from "next/server";
import fs from "fs";

export const dynamic = "force-dynamic";

const AUTH_PROFILES_PATH = "/home/mathew/.openclaw/agents/main/agent/auth-profiles.json";

function getMiniMaxApiKey(): string | null {
  try {
    if (fs.existsSync(AUTH_PROFILES_PATH)) {
      const data = JSON.parse(fs.readFileSync(AUTH_PROFILES_PATH, "utf-8"));
      const key = data?.profiles?.["minimax:global"]?.key;
      if (key) return key;
    }
  } catch { /* fall through */ }
  return process.env.MINIMAX_API_KEY || null;
}

async function fetchMiniMaxUsage() {
  const apiKey = getMiniMaxApiKey();
  if (!apiKey) return { error: "no_api_key", usage: null, detail: null };

  const url = "https://api.minimax.io/v1/api/openplatform/coding_plan/remains";
  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: `http_${res.status}`, usage: null, detail: text.slice(0, 100) };
    }

    const data = await res.json();
    const baseResp = data.base_resp || data.baseResp;
    if (baseResp && baseResp.status_code !== 0 && baseResp.status_code !== "0") {
      return { error: `api_${baseResp.status_code}`, usage: null, detail: baseResp.status_msg };
    }

    const models: Array<{
      name: string;
      usedPrompts: number;
      totalPrompts: number;
      remainingPrompts: number;
      usagePercent: number;
      windowResetsAt: string | null;
      windowResetsInMs: number;
    }> = [];

    for (const m of data.model_remains || []) {
      const total = m.current_interval_total_count ?? 0;
      const remaining = m.current_interval_remaining_count ?? 0;
      const used = total - remaining;
      const pct = total > 0 ? Math.round((used / total) * 100) : 0;
      const remainsMs = m.remains_time ?? 0;

      models.push({
        name: m.model_name || "unknown",
        usedPrompts: used,
        totalPrompts: total,
        remainingPrompts: remaining,
        usagePercent: pct,
        windowResetsAt: remainsMs > 0 ? new Date(Date.now() + remainsMs).toISOString() : null,
        windowResetsInMs: remainsMs,
      });
    }

    const totalUsed = models.reduce((s, m) => s + m.usedPrompts, 0);
    const totalRemaining = models.reduce((s, m) => s + m.remainingPrompts, 0);
    const totalAll = totalUsed + totalRemaining;
    const overallPct = totalAll > 0 ? Math.round((totalUsed / totalAll) * 100) : 0;
    const nearestResetMs = models.length > 0
      ? Math.min(...models.map((m) => m.windowResetsInMs).filter((ms) => ms > 0))
      : 0;

    return {
      error: null,
      usage: {
        models,
        summary: {
          totalUsedPrompts: totalUsed,
          totalRemainingPrompts: totalRemaining,
          totalAllPrompts: totalAll,
          overallUsagePercent: overallPct,
          nextWindowResetAt: nearestResetMs > 0
            ? new Date(Date.now() + nearestResetMs).toISOString()
            : null,
          nextWindowResetInMs: nearestResetMs,
        },
      },
    };
  } catch (err: any) {
    return { error: "network", usage: null, detail: err.message };
  }
}

export async function GET() {
  const { error, usage, detail } = await fetchMiniMaxUsage();

  if (error === "no_api_key") {
    return NextResponse.json({
      source: "auth-profiles.json",
      timestamp: new Date().toISOString(),
      available: false,
      models: [],
      summary: null,
      note: "No MiniMax API key found in auth-profiles.json or env vars.",
    });
  }

  if (error) {
    return NextResponse.json({
      source: "minimax_api",
      timestamp: new Date().toISOString(),
      available: false,
      models: [],
      summary: null,
      note: `MiniMax API error: ${error}${detail ? ` — ${detail}` : ""}.`,
    });
  }

  return NextResponse.json({
    source: "minimax_api",
    timestamp: new Date().toISOString(),
    available: true,
    models: usage!.models,
    summary: usage!.summary,
    note: "Live usage from MiniMax Coding Plan API.",
  });
}