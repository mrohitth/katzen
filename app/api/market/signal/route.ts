import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 minute cache

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  signal: "BULL" | "BEAR" | "NEUTRAL";
  source: "live" | "cached" | "fallback";
}

interface ExpenseInfo {
  er: number;
  erFormatted: string;
  annualFee: number;
  flagged: boolean;
}

interface PortfolioPosition {
  ticker: string;
  shares: number;
  marketValue: number;
  weight: number;
  currentPrice: number;
  dayChangePercent: number;
  expense?: ExpenseInfo;
}

const MARKETBOT_CACHE = "/home/mathew/MarketBot/data/last-known-prices.json";
const PORTFOLIO_FILE = "/home/mathew/MarketBot/data/portfolio.json";

// Expense ratios (mirrored from MarketBot types.ts)
const EXPENSE_RATIOS: Record<string, number> = {
  "VTI": 0.0003, "VOO": 0.0003, "QQQ": 0.0020, "SCHG": 0.0004,
  "SMH": 0.0035, "XLE": 0.0009, "XLV": 0.0009, "VXUS": 0.0004,
  "SCHD": 0.0006, "SPYD": 0.0007, "SPAXX": 0.0042,
  "SPY": 0.000945, "TLT": 0.0015, "GLD": 0.0040,
  "SOXX": 0.0035, "XLI": 0.0009, "XLB": 0.0009, "VHT": 0.0009,
  "VBR": 0.0007, "AVUV": 0.0025,
};
const ER_FLAG_THRESHOLD = 0.0020;

function computeFeeDrag(marketValue: number, ticker: string): ExpenseInfo {
  const er = EXPENSE_RATIOS[ticker] ?? 0;
  const annualFee = marketValue * er;
  return {
    er,
    erFormatted: (er * 100).toFixed(3) + "%",
    annualFee: Math.round(annualFee * 100) / 100,
    flagged: er > ER_FLAG_THRESHOLD && er > 0,
  };
}

function getCachedPrice(ticker: string): number | null {
  try {
    if (fs.existsSync(MARKETBOT_CACHE)) {
      const cache = JSON.parse(fs.readFileSync(MARKETBOT_CACHE, "utf8"));
      return cache[ticker]?.price ?? null;
    }
  } catch { /* non-fatal */ }
  return null;
}

// Fallback prices (from USER.md May 9 snapshot — used only when MarketBot cache is unavailable)
const FALLBACK_PRICES: Record<string, { price: number; changePercent: number }> = {
  NVDA: { price: 215.20, changePercent: 1.77 },
  SMH:  { price: 566.54, changePercent: 4.90 },
  QQQ:  { price: 711.23, changePercent: 2.30 },
  VTI:  { price: 362.87, changePercent: 1.17 },
  VOO:  { price: 678.04, changePercent: 1.12 },
  SCHG: { price: 34.12,  changePercent: 0.85 },
  XLE:  { price: 55.70,  changePercent: -0.13 },
  XLV:  { price: 143.49, changePercent: -0.14 },
  VXUS: { price: 85.43,  changePercent: 0.67 },
  SCHD: { price: 31.62,  changePercent: 0.38 },
  SPYD: { price: 46.69,  changePercent: 0.67 },
  AMGN: { price: 331.70, changePercent: 0.95 },
  ASTS: { price: 75.05,  changePercent: -3.81 },
};

// Core portfolio tickers tracked
const PORTFOLIO_TICKERS = ["NVDA", "VTI", "QQQ", "VOO", "SCHG", "XLE", "SMH", "XLV", "VXUS", "SCHD", "AMGN", "SPYD", "ASTS"];
const MARKET_TICKERS = ["NVDA", "SMH", "SCHG", "QQQ", "VTI", "VOO", "XLE", "XLV"];

export async function GET() {
  try {
    // ── Market Signal Quotes ──
    const quotes: StockQuote[] = [];
    let liveCount = 0;

    for (const ticker of MARKET_TICKERS) {
      const cached = getCachedPrice(ticker);
      const fallback = FALLBACK_PRICES[ticker];
      let price: number;
      let changePercent: number;
      let source: "live" | "cached" | "fallback";

      if (cached) {
        price = cached;
        changePercent = fallback?.changePercent ?? 0;
        source = "live";
        liveCount++;
      } else if (fallback) {
        price = fallback.price;
        changePercent = fallback.changePercent;
        source = "fallback";
      } else {
        continue;
      }

      let signal: "BULL" | "BEAR" | "NEUTRAL" = "NEUTRAL";
      if (changePercent > 0.5) signal = "BULL";
      else if (changePercent < -0.5) signal = "BEAR";

      quotes.push({
        symbol: ticker,
        price,
        change: (price * changePercent) / 100,
        changePercent,
        signal,
        source,
      });
    }

    // ── Portfolio Positions with Expense Ratios ──
    let portfolio: PortfolioPosition[] = [];
    try {
      if (fs.existsSync(PORTFOLIO_FILE)) {
        const pf = JSON.parse(fs.readFileSync(PORTFOLIO_FILE, "utf8"));
        const positions = pf.positions ?? {};
        let totalValue = 0;

        // Calculate total first
        for (const [ticker, data] of Object.entries(positions)) {
          if (ticker === "SPAXX") continue; // cash, exclude from ER calc
          const shares = (data as any).shares ?? 0;
          const price = FALLBACK_PRICES[ticker]?.price ?? 0;
          totalValue += shares * price;
        }

        for (const [ticker, data] of Object.entries(positions)) {
          const shares = (data as any).shares ?? 0;
          const price = FALLBACK_PRICES[ticker]?.price ?? 0;
          const marketValue = shares * price;
          const dayChangePercent = FALLBACK_PRICES[ticker]?.changePercent ?? 0;
          const expense = EXPENSE_RATIOS[ticker] ? computeFeeDrag(marketValue, ticker) : undefined;

          portfolio.push({
            ticker,
            shares,
            marketValue,
            weight: totalValue > 0 ? (marketValue / totalValue) * 100 : 0,
            currentPrice: price,
            dayChangePercent,
            expense,
          });
        }

        // Sort by weight descending
        portfolio.sort((a, b) => b.weight - a.weight);
      }
    } catch { /* non-fatal */ }

    return NextResponse.json({
      quotes,
      portfolio,
      timestamp: new Date().toISOString(),
      source: liveCount > 0 ? "marketbot_live" : "fallback",
    });
  } catch (error) {
    console.error("Market signal error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data", quotes: [], portfolio: [] },
      { status: 500 }
    );
  }
}
