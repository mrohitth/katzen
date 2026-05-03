"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Folder, FileText, PlusCircle, GitBranch, Star, Eye, Bug, TrendingUp, TrendingDown, Minus } from "lucide-react";

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

export default function ProjectsPage() {
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null);
  const [marketData, setMarketData] = useState<MarketQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch GitHub stats
    fetch("/api/github/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) {
          setGithubStats(data.stats);
        }
      })
      .catch(console.error);

    // Fetch market data
    fetch("/api/market/signal")
      .then((res) => res.json())
      .then((data) => {
        if (data.quotes) {
          setMarketData(data.quotes);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const projects = [
    {
      name: "katzen",
      path: "/home/mathew/katzen",
      isDirectory: true,
      type: "primary",
      description: "Mission Control Dashboard",
    },
    {
      name: "personal",
      path: "/home/mathew/personal",
      isDirectory: false,
      type: "support",
      description: "Personal workspace",
    },
  ];

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
            {/* Stats Row */}
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

            {/* Recent Commits */}
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

      {/* Projects Grid */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
          Workspace
        </h2>
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
                      project.type === "primary"
                        ? "bg-moss/10 text-moss border-moss/20"
                        : "bg-violet/10 text-violet border-violet/20"
                    }`}
                  >
                    {project.type}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
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
                  <p className="text-text-muted text-xs font-mono">
                    Mission Control Dashboard
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-obsidian text-text-muted font-mono text-xs"
                >
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
                  <p className="text-text-muted text-xs font-mono">
                    Personal workspace
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-obsidian text-text-muted font-mono text-xs"
                >
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
                <span className="text-text-primary font-mono">
                  ${quote.price.toFixed(2)}
                </span>
                <div className="flex items-center gap-1">
                  {quote.signal === "BULL" && <TrendingUp className="w-3 h-3 text-moss" />}
                  {quote.signal === "BEAR" && <TrendingDown className="w-3 h-3 text-amber" />}
                  {quote.signal === "NEUTRAL" && <Minus className="w-3 h-3 text-text-muted" />}
                  <span
                    className={`text-xs font-mono ${
                      quote.change >= 0 ? "text-moss" : "text-amber"
                    }`}
                  >
                    {quote.change >= 0 ? "+" : ""}
                    {quote.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-text-muted text-xs font-mono">
            AI/SEMICONDUCTOR FOCUS
          </div>
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