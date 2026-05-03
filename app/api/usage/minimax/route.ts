import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Fetch live balance/usage from MiniMax API.
 * Falls back to sessions.json derived data if API is unreachable.
 */
async function fetchMiniMaxBalance(): Promise<{
  balance?: number;
  currency?: string;
  error?: string;
} | null> {
  const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENCLAW_MINIMAX_API_KEY;
  if (!apiKey) return null;

  try {
    // MiniMax usage/balance endpoint
    const res = await fetch("https://api.minimax.io/v1/query/balance", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json() as { balance?: number; credit?: number; currency?: string };
    return {
      balance: data.balance ?? data.credit ?? undefined,
      currency: data.currency ?? "USD",
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const mxnBalance = await fetchMiniMaxBalance();

    const result = {
      source: "minimax_api" as const,
      timestamp: new Date().toISOString(),
      balance: mxnBalance?.balance ?? null,
      currency: mxnBalance?.currency ?? "USD",
      note: mxnBalance?.balance !== undefined
        ? "Live balance from MiniMax API — this is the source of truth."
        : "MiniMax API unreachable. Budget card shows estimated cost from session logs.",
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch MiniMax balance" },
      { status: 500 }
    );
  }
}