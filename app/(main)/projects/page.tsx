"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Folder,
  FileText,
  GitBranch,
  Star,
  Eye,
  Bug,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Zap,
  DollarSign,
  PieChart,
  Cpu,
  Radio,
} from "lucide-react";

import SwarmActivityFeed from "@/components/swarm-activity-feed";

interface GitHubStats {
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  defaultBranch: string;
  lastPush: string;
  commits: { sha: string; message: string; date: string; author: string }[];
}

interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  signal: "BULL" | "BEAR" | "NEUTRAL";
}

interface SchedulerData {
  jobs: { name: string; schedule: string; nextRun: string | null; status: string }[];
  nextRun: string | null;
  nextRunName: string | null;
}

interface UsageData {
  today: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
    sessionCount: number;
  };
  budget: {
    daily: number;
    remaining: number;
    percentUsed: number;
    status: string;
  };
  model: {
    name: string;
    inputCostPer1M: number;
    outputCostPer1M: number;
  };
}

interface Holding {
  symbol: string;
  name: string;
  shares: number | null;
  avgCost: number | null;
  allocation: number; // percentage
  type: "BROAD_INDEX" | "AI_CHIP" | "SEMI_ETF" | "GROWTH_ETF" | "DIVIDEND_ETF" | "INTL_ETF" | "SPECULATIVE";
  color: string;
}

const HOLDINGS: Holding[] = [
  { symbol: "VTI",  name: "Vanguard Total Stock Market", shares: 34,   avgCost: 230.97, allocation: 20.2, type: "BROAD_INDEX",   color: "#6366F1" },
  { symbol: "NVDA", name: "NVIDIA",                    shares: 41.6, avgCost: 203.11, allocation: 18.9, type: "AI_CHIP",        color: "#4ADE80" },
  { symbol: "VOO",  name: "Vanguard S&P 500 ETF",     shares: 17.1, avgCost: 402.90, allocation: 17.6, type: "BROAD_INDEX",   color: "#818CF8" },
  { symbol: "QQQ",  name: "Invesco QQQ Trust",        shares: 9.4,  avgCost: 596.86, allocation: 14.4, type: "GROWTH_ETF",    color: "#38BDF8" },
  { symbol: "SMH",  name: "VanEck Semiconductor ETF", shares: 8.1,  avgCost: 503.28, allocation: 9.5,  type: "SEMI_ETF",      color: "#A78BFA" },
  { symbol: "SCHG", name: "Schwab US Large-Cap Growth",shares: 102.4, avgCost: 30.01, allocation: 7.8, type: "GROWTH_ETF",    color: "#FBBF24" },
  { symbol: "VXUS", name: "Vanguard Total International",shares: 29.7, avgCost: 73.16, allocation: 5.6, type: "INTL_ETF",     color: "#F472B6" },
  { symbol: "SCHD", name: "Schwab US Dividend Equity", shares: 75.2, avgCost: 29.35, allocation: 5.5, type: "DIVIDEND_ETF",  color: "#34D399" },
  { symbol: "SPYD", name: "SPDR S&P 500 High Dividend",shares: 3.7,  avgCost: 40.72, allocation: 0.4,  type: "DIVIDEND_ETF",  color: "#FB923C" },
  { symbol: "ASTS", name: "AST Spacemobile",          shares: 8.7,  avgCost: 11.42, allocation: 0.2,  type: "SPECULATIVE",   color: "#EF4444" },
];

export default function ProjectsPage() {
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null);
  const [marketData, setMarketData] = useState<MarketQuote[]>([]);
  const [schedulerData, setSchedulerData] = useState<SchedulerData | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/github/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setGithubStats(data.stats);
      })
      .catch(console.error);

    fetch("/api/market/signal")
      .then((res) => res.json())
      .then((data) => {
        if (data.quotes) setMarketData(data.quotes);
      })
      .catch(console.error);

    fetch("/api/scheduler")
      .then((res) => res.json())
      .then((data) => {
        setSchedulerData(data);
      })
      .catch(console.error);

    fetch("/api/usage")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setUsageData(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!schedulerData?.nextRun) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const nextRun = new Date(schedulerData.nextRun!).getTime();
      const now = Date.now();
      const diff = nextRun - now;

      if (diff <= 0) {
        setCountdown("00:00");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [schedulerData?.nextRun]);

  const [projects, setProjects] = useState<{
    name: string;
    path: string;
    isDirectory: boolean;
    description: string;
  }[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects) setProjects(data.projects);
      })
      .catch(console.error)
      .finally(() => setLoadingProjects(false));
  }, []);

  useEffect(() => {
    fetch("/api/github/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setGithubStats(data.stats);
      })
      .catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get market data for holdings
  const getHoldingWithMarket = (symbol: string) => {
    const quote = marketData.find((q) => q.symbol === symbol);
    const holding = HOLDINGS.find((h) => h.symbol === symbol);
    return {
      ...holding,
      price: quote?.price || holding?.avgCost || 0,
      change: quote?.change || 0,
      changePercent: quote?.changePercent || 0,
      signal: quote?.signal || "NEUTRAL",
    };
  };

  // Portfolio summary
  const totalValue = 43757.84;
  const totalGain = 3027.95;

  return (
    <div className="p-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
          <Badge variant="outline" className="border-violet text-violet font-mono text-xs">
            {projects.length} FOUND
          </Badge>
        </div>
        <p className="text-text-secondary text-sm">
          Workspace directories and tracked repositories
        </p>
      </div>

      {/* Scheduler & Portfolio Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Scheduler Card */}
        <Card className="bg-obsidian-light border-border rounded-xl p-5 glow-amber">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber" />
            </div>
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Next Heartbeat
            </h2>
            <Badge
              variant="secondary"
              className="bg-amber/10 text-amber border-amber/20 font-mono text-xs animate-pulse"
            >
              SCHEDULED
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-xs mb-1">Next Run In</p>
              <p className="text-2xl font-mono text-amber">
                {countdown || "--:--"}
              </p>
              <p className="text-text-muted text-xs mt-1">
                {schedulerData?.nextRunName || "Heartbeat"}
              </p>
            </div>
            {schedulerData?.jobs && schedulerData.jobs.length > 0 && (
              <div className="text-right">
                <p className="text-text-muted text-xs">All Jobs</p>
                <p className="text-text-primary font-mono">
                  {schedulerData.jobs.length}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Portfolio Health Card */}
        <Card className="bg-obsidian-light border-border rounded-xl p-5 glow-violet">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet/10 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-violet" />
            </div>
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Portfolio Health
            </h2>
            <Badge variant="secondary" className="bg-violet/10 text-violet border-violet/20 font-mono text-xs">
              AI/SEMI FOCUS
            </Badge>
          </div>

          {/* Allocation Bar */}
          <div className="space-y-3">
            <div className="h-3 bg-obsidian rounded-full overflow-hidden flex">
              {HOLDINGS.map((h) => (
                <div
                  key={h.symbol}
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${h.allocation}%`,
                    backgroundColor: h.color,
                  }}
                  title={`${h.symbol}: ${h.allocation}%`}
                />
              ))}
            </div>

            {/* Holdings Breakdown */}
            <div className="space-y-2">
              {HOLDINGS.map((h) => {
                const market = getHoldingWithMarket(h.symbol);
                return (
                  <div key={h.symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: h.color }}
                      />
                      <span className="text-text-primary text-sm font-mono">
                        {h.symbol}
                      </span>
                      <span className="text-text-muted text-xs">
                        {h.allocation}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {market.price > 0 && (
                        <>
                          <span className="text-text-primary text-sm font-mono">
                            ${market.price.toFixed(2)}
                          </span>
                          <span
                            className={`text-xs font-mono ${
                              market.change >= 0 ? "text-moss" : "text-amber"
                            }`}
                          >
                            {market.change >= 0 ? "+" : ""}
                            {market.changePercent.toFixed(2)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Category Summary */}
            <div className="flex items-center gap-4 pt-2 border-t border-border/50 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-indigo-500" />
                <span className="text-text-muted text-xs">Broad Index: 38%</span>
              </div>
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-moss" />
                <span className="text-text-muted text-xs">AI Chip: 19%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-sky-400" />
                <span className="text-text-muted text-xs">Tech: 14%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-violet" />
                <span className="text-text-muted text-xs">Semi: 10%</span>
              </div>
            </div>
            <div className="mt-2 text-text-muted text-xs">
              Total Value: $43,757.84 | Day: -0.25% | 10 positions
            </div>
          </div>
        </Card>
      </div>

      {/* Resource Consumption Card */}
      <Card className="bg-obsidian-light border-border rounded-xl p-5 mb-8 glow-moss">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-moss/10 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-moss" />
          </div>
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            Budget Card
          </h2>
          <Badge
            variant="secondary"
            className={`font-mono text-xs ${
              usageData?.budget.status === "OVER_BUDGET"
                ? "bg-amber/10 text-amber border-amber/20"
                : "bg-moss/10 text-moss border-moss/20"
            }`}
          >
            {usageData?.budget.status || "OK"}
          </Badge>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-text-muted">
            <div className="w-4 h-4 rounded-full border-2 border-moss/30 border-t-moss animate-spin" />
            <span className="text-sm font-mono">Calculating...</span>
          </div>
        ) : usageData ? (
          <div className="space-y-3">
            <div className="h-2 bg-obsidian rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  usageData.budget.percentUsed > 80
                    ? "bg-amber"
                    : "bg-moss"
                }`}
                style={{ width: `${Math.min(100, usageData.budget.percentUsed)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-xs">Daily Burn</p>
                <p className="text-text-primary font-mono text-lg">
                  ${usageData.today.estimatedCost.toFixed(4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-text-muted text-xs">Budget</p>
                <p className="text-text-primary font-mono">
                  ${usageData.budget.daily.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-obsidian/50">
                <p className="text-text-muted text-xs">Tokens</p>
                <p className="text-text-primary font-mono text-sm">
                  {(usageData.today.totalTokens / 1000).toFixed(1)}k
                </p>
              </div>
              <div className="p-2 rounded bg-obsidian/50">
                <p className="text-text-muted text-xs">Sessions</p>
                <p className="text-text-primary font-mono text-sm">
                  {usageData.today.sessionCount}
                </p>
              </div>
              <div className="p-2 rounded bg-obsidian/50">
                <p className="text-text-muted text-xs">Remaining</p>
                <p className="text-moss font-mono text-sm">
                  ${usageData.budget.remaining.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-text-muted text-sm font-mono">Unable to load usage data</p>
        )}
      </Card>

      {/* Swarm Activity Feed */}
      <Card className="bg-obsidian-light border-border rounded-xl p-6 mb-8 glow-violet">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-violet" />
          </div>
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            Swarm Activity Feed
          </h2>
          <Badge variant="secondary" className="bg-violet/10 text-violet border-violet/20 font-mono text-xs">
            LIVE
          </Badge>
        </div>
        <SwarmActivityFeed />
      </Card>

      {/* GitHub Stats Card */}
      <Card className="bg-obsidian-light border-border rounded-xl p-6 mb-8 glow-moss">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-moss/10 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-moss" />
          </div>
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            System Health
          </h2>
          <Badge variant="secondary" className="bg-moss/10 text-moss border-moss/20 font-mono text-xs">
            LIVE
          </Badge>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-text-muted">
            <div className="w-4 h-4 rounded-full border-2 border-moss/30 border-t-moss animate-spin" />
            <span className="text-sm font-mono">Fetching GitHub data...</span>
          </div>
        ) : githubStats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber" />
                <span className="text-text-primary font-mono text-lg">{githubStats.stars}</span>
                <span className="text-text-muted text-xs">stars</span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-violet" />
                <span className="text-text-primary font-mono text-lg">{githubStats.forks}</span>
                <span className="text-text-muted text-xs">forks</span>
              </div>
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-amber" />
                <span className="text-text-primary font-mono text-lg">{githubStats.openIssues}</span>
                <span className="text-text-muted text-xs">issues</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-moss" />
                <span className="text-text-primary font-mono text-lg">{githubStats.watchers}</span>
                <span className="text-text-muted text-xs">watchers</span>
              </div>
            </div>

            <Separator className="bg-border/50" />

            <div>
              <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                Recent Commits
              </h3>
              <div className="space-y-2">
                {githubStats.commits.map((commit) => (
                  <div
                    key={commit.sha}
                    className="flex items-center gap-3 p-2 rounded-lg bg-obsidian/50 hover:bg-obsidian transition-colors"
                  >
                    <code className="text-moss text-xs font-mono">{commit.sha}</code>
                    <span className="text-text-secondary text-sm flex-1 truncate">
                      {commit.message}
                    </span>
                    <span className="text-text-muted text-xs font-mono">
                      {formatRelativeTime(commit.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-text-muted text-sm font-mono">Unable to load GitHub stats</p>
        )}
      </Card>

      {/* Dynamic Projects Grid */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            Discovered Projects
          </h2>
          <Badge variant="outline" className="border-violet text-violet font-mono text-xs">
            {projects.length} FOUND
          </Badge>
        </div>
        {loadingProjects ? (
          <div className="flex items-center gap-3 text-text-muted">
            <div className="w-4 h-4 rounded-full border-2 border-violet/30 border-t-violet animate-spin" />
            <span className="text-sm font-mono">Scanning memory/ [PROJECT] tags + workspace/projects/...</span>
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card
                key={project.name}
                className="bg-obsidian-light border-border p-5 rounded-xl glow-violet hover:border-violet/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet/10 flex items-center justify-center flex-shrink-0">
                    {project.isDirectory ? (
                      <Folder className="w-5 h-5 text-violet" />
                    ) : (
                      <FileText className="w-5 h-5 text-violet" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text-primary font-medium mb-1 truncate">
                      {project.name}
                    </h3>
                    <p className="text-text-muted text-xs font-mono mb-2">
                      {project.description}
                    </p>
                    <Badge
                      variant="secondary"
                      className={`font-mono text-xs ${
                        project.isDirectory
                          ? "bg-violet/10 text-violet border-violet/20"
                          : "bg-obsidian text-text-muted"
                      }`}
                    >
                      {project.isDirectory ? "directory" : "tag"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm font-mono">
            No projects found. Add [PROJECT] tags to memory/*.md or create workspace/projects/ folders.
          </p>
        )}
      </div>

      {/* GitHub Integration */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
          GitHub Repos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://github.com/mrohitth/katzen"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="bg-obsidian-light border-border p-4 rounded-xl hover:border-moss/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-moss/10 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-moss" />
                </div>
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-medium group-hover:text-moss transition-colors">
                    mrohitth/katzen
                  </p>
                  <p className="text-text-muted text-xs font-mono">Mission Control Dashboard</p>
                </div>
                <Badge variant="secondary" className="bg-obsidian text-text-muted font-mono text-xs">
                  Primary
                </Badge>
              </div>
            </Card>
          </a>

          <a
            href="https://github.com/mrohitth/personal"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="bg-obsidian-light border-border p-4 rounded-xl hover:border-moss/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet/10 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-violet" />
                </div>
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-medium group-hover:text-moss transition-colors">
                    mrohitth/personal
                  </p>
                  <p className="text-text-muted text-xs font-mono">Personal workspace</p>
                </div>
                <Badge variant="secondary" className="bg-obsidian text-text-muted font-mono text-xs">
                  Support
                </Badge>
              </div>
            </Card>
          </a>
        </div>
      </div>

      {/* Market Signal Bar - Fixed at bottom */}
      <div className="fixed bottom-0 left-16 right-0 bg-obsidian-light border-t border-border p-3 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-moss" />
            <span className="text-text-muted text-xs font-mono uppercase">Market Signal</span>
          </div>
          <div className="flex items-center gap-6">
            {marketData.map((quote) => (
              <div key={quote.symbol} className="flex items-center gap-3">
                <span className="text-text-primary font-mono text-sm font-medium">
                  {quote.symbol}
                </span>
                <span className="text-text-primary font-mono">${quote.price.toFixed(2)}</span>
                <div className="flex items-center gap-1">
                  {quote.signal === "BULL" && <TrendingUp className="w-3 h-3 text-moss" />}
                  {quote.signal === "BEAR" && <TrendingDown className="w-3 h-3 text-amber" />}
                  {quote.signal === "NEUTRAL" && <Minus className="w-3 h-3 text-text-muted" />}
                  <span
                    className={`text-xs font-mono ${quote.change >= 0 ? "text-moss" : "text-amber"}`}
                  >
                    {quote.change >= 0 ? "+" : ""}
                    {quote.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-text-muted text-xs font-mono">AI/SEMICONDUCTOR FOCUS</div>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}