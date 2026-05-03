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

// Fetch live quotes from Alpha Vantage (free tier: 25 req/day)
async function fetchAlphaVantageQuote(symbol: string): Promise<StockQuote | null> {
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
  if (!API_KEY) return null;

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}&datatype=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json();
    const q = data["Global Quote"];
    if (!q || !q["05. price"]) return null;

    const price = parseFloat(q["05. price"]);
    const change = parseFloat(q["09. change"]);
    const changePercent = parseFloat(q["10. change percent"]?.replace("%", "")) || 0;

    let signal: "BULL" | "BEAR" | "NEUTRAL" = "NEUTRAL";
    if (changePercent > 0.5) signal = "BULL";
    else if (changePercent < -0.5) signal = "BEAR";

    return { symbol, price, change, changePercent, signal };
  } catch {
    return null;
  }
}

// Fallback mock data for when Alpha Vantage is unavailable
const MOCK_QUOTES: Record<string, StockQuote> = {
  NVDA:  { symbol: "NVDA",  price: 198.45, change: -1.12, changePercent: -0.56, signal: "BEAR" as const },
  SMH:   { symbol: "SMH",   price: 509.82, change: 15.40, changePercent: 3.12,  signal: "BULL" as const },
  SCHG:  { symbol: "SCHG",  price: 33.14,  change: 0.28,  changePercent: 0.85,  signal: "BULL" as const },
  QQQ:   { symbol: "QQQ",   price: 674.15, change: -5.20, changePercent: -0.77, signal: "BEAR" as const },
  SCHD:  { symbol: "SCHD",  price: 31.86,  change: 0.12,  changePercent: 0.38,  signal: "NEUTRAL" as const },
  VXUS:  { symbol: "VXUS",  price: 82.97,  change: 0.55,  changePercent: 0.67,  signal: "BULL" as const },
  VOOG:  { symbol: "VOOG",  price: 78.46,  change: 0.92,  changePercent: 1.19,  signal: "BULL" as const },
};

const TICKERS = ["NVDA", "SMH", "SCHG", "QQQ", "SCHD", "VXUS", "VOOG"];

export async function GET() {
  try {
    const quotes: StockQuote[] = [];
    let liveCount = 0;

    for (const ticker of TICKERS) {
      const quote = await fetchAlphaVantageQuote(ticker);
      if (quote) {
        quotes.push(quote);
        liveCount++;
      } else {
        // Use mock with tiny random variation
        const mock = MOCK_QUOTES[ticker];
        if (mock) {
          quotes.push({
            ...mock,
            price: +(mock.price * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2),
          });
        }
      }
    }

    return NextResponse.json({
      quotes,
      timestamp: new Date().toISOString(),
      source: liveCount > 0 ? "alphavantage" : "mock",
      liveCount,
    });
  } catch (error) {
    console.error("Market signal error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data", quotes: [] },
      { status: 500 }
    );
  }
}