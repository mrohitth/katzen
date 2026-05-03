import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const AGENTS_DIR = process.env.OPENCLAW_AGENTS_DIR || "/home/mathew/.openclaw/agents";

interface UsageStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  sessionCount: number;
  sessionIds: string[];
}

function getSessionsData(): UsageStats {
  const sessionsFile = path.join(AGENTS_DIR, "main", "sessions", "sessions.json");
  
  if (!fs.existsSync(sessionsFile)) {
    return {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      sessionCount: 0,
      sessionIds: [],
    };
  }

  const data = JSON.parse(fs.readFileSync(sessionsFile, "utf-8"));
  
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  const sessionIds: string[] = [];

  // Filter sessions updated today
  const today = new Date().toDateString();

  for (const [key, session] of Object.entries(data)) {
    const sess = session as any;
    if (sess.sessionId && sess.updatedAt) {
      const sessionDate = new Date(sess.updatedAt).toDateString();
      if (sessionDate === today) {
        totalInput += sess.inputTokens || 0;
        totalOutput += sess.outputTokens || 0;
        totalCost += sess.estimatedCostUsd || 0;
        sessionIds.push(sess.sessionId.slice(0, 8));
      }
    }
  }

  return {
    totalTokens: totalInput + totalOutput,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    estimatedCost: totalCost,
    sessionCount: sessionIds.length,
    sessionIds: [...new Set(sessionIds)],
  };
}

export async function GET() {
  try {
    // Fetch live MiniMax balance
    const mxnRes = await fetch(process.env.OPENCLAW_WORKSPACE
      ? `${process.env.OPENCLAW_WORKSPACE}/.api-usage/minimax`
      : "http://localhost:3000/api/usage/minimax",
      { signal: AbortSignal.timeout(3000) }
    ).catch(() => null);

    let minimaxBalance: number | null = null;
    if (mxnRes?.ok) {
      const mxnData = await mxnRes.json() as { balance?: number };
      minimaxBalance = mxnData.balance ?? null;
    }

    const stats = getSessionsData();

    const dailyBudget = 1.0;
    const burnRate = stats.estimatedCost;
    const budgetRemaining = Math.max(0, dailyBudget - burnRate);
    const percentUsed = Math.min(100, (burnRate / dailyBudget) * 100);

    return NextResponse.json({
      today: {
        inputTokens: stats.inputTokens,
        outputTokens: stats.outputTokens,
        totalTokens: stats.totalTokens,
        estimatedCost: +burnRate.toFixed(4),
        sessionCount: stats.sessionCount,
      },
      budget: {
        daily: dailyBudget,
        remaining: +budgetRemaining.toFixed(4),
        percentUsed: +percentUsed.toFixed(1),
        status: burnRate > dailyBudget ? "OVER_BUDGET" : "OK",
      },
      minimax: {
        balance: minimaxBalance,
        source: minimaxBalance !== null ? "live" : "unavailable",
      },
      model: {
        name: "MiniMax M2.7",
        inputCostPer1M: 0.3,
        outputCostPer1M: 1.2,
      },
    });
  } catch (error) {
    console.error("Usage stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage stats" },
      { status: 500 }
    );
  }
}