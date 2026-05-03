import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Fetch live usage from MiniMax Coding Plan API.
 * Endpoint: /v1/api/openplatform/coding_plan/remains
 * Returns per-model prompt usage counts, remaining counts, and window reset times.
 */
async function fetchMiniMaxUsage() {
  const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENCLAW_MINIMAX_API_KEY;
  if (!apiKey) return null;

  const url = "https://api.minimax.io/v1/api/openplatform/coding_plan/remains";
  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    const baseResp = data.base_resp || data.baseResp;
    if (baseResp && baseResp.status_code !== 0 && baseResp.status_code !== "0") {
      return null;
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

    const modelRemains = data.model_remains || [];
    for (const m of modelRemains) {
      const total = m.current_interval_total_count ?? 0;
      const remaining = m.current_interval_remaining_count ?? 0;
      const used = total - remaining;
      const pct = total > 0 ? Math.round((used / total) * 100) : 0;

      // remains_time is in milliseconds — window reset countdown
      const remainsMs = m.remains_time ?? 0;
      const windowResetsAt = remainsMs > 0
        ? new Date(Date.now() + remainsMs).toISOString()
        : null;

      models.push({
        name: m.model_name || "unknown",
        usedPrompts: used,
        totalPrompts: total,
        remainingPrompts: remaining,
        usagePercent: pct,
        windowResetsAt,
        windowResetsInMs: remainsMs,
      });
    }

    // Aggregate totals
    const totalUsed = models.reduce((sum, m) => sum + m.usedPrompts, 0);
    const totalRemaining = models.reduce((sum, m) => sum + m.remainingPrompts, 0);
    const totalAll = totalUsed + totalRemaining;
    const overallPct = totalAll > 0 ? Math.round((totalUsed / totalAll) * 100) : 0;

    // Nearest window reset (earliest)
    const nearestResetMs = models.length > 0
      ? Math.min(...models.map((m) => m.windowResetsInMs).filter((ms) => ms > 0))
      : 0;

    return {
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
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const usage = await fetchMiniMaxUsage();

  return NextResponse.json({
    source: "minimax_api",
    timestamp: new Date().toISOString(),
    available: usage !== null,
    models: usage?.models ?? [],
    summary: usage?.summary ?? null,
    note: usage
      ? "Live usage from MiniMax Coding Plan API — per-model prompt counts and window reset timers."
      : "MiniMax API unreachable or no API key. Check MINIMAX_API_KEY env var.",
  });
}