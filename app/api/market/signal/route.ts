import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 minute cache

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  signal: "BULL" | "BEAR" | "NEUTRAL";
}

// Mock data for demo - in production, use Yahoo Finance or similar free API
const MOCK_QUOTES: Record<string, StockQuote> = {
  NVDA: {
    symbol: "NVDA",
    price: 875.42,
    change: 23.18,
    changePercent: 2.72,
    signal: "BULL",
  },
  SMH: {
    symbol: "SMH",
    price: 198.35,
    change: 4.12,
    changePercent: 2.12,
    signal: "BULL",
  },
  SCHG: {
    symbol: "SCHG",
    price: 112.87,
    change: -1.43,
    changePercent: -1.25,
    signal: "BEAR",
  },
};

export async function GET() {
  try {
    // In production, you'd fetch from a real API like:
    // Yahoo Finance: https://query1.finance.yahoo.com/v8/finance/chart/NVDA
    // Alpha Vantage, Finnhub, etc.
    
    // For now, use mock data with slight randomization to simulate live data
    const quotes: StockQuote[] = Object.values(MOCK_QUOTES).map((q) => ({
      ...q,
      // Add tiny random variation to simulate movement
      price: +(q.price * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2),
    }));

    return NextResponse.json({
      quotes,
      timestamp: new Date().toISOString(),
      source: "mock",
    });
  } catch (error) {
    console.error("Market signal error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data", quotes: [] },
      { status: 500 }
    );
  }
}