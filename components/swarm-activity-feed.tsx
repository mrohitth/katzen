"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock } from "lucide-react";

interface FeedEntry {
  id: string;
  agent: string;
  action: string;
  timestamp: string;
  type: "arrival" | "task" | "memory" | "system";
}

export default function SwarmActivityFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      // Fetch recent memory entries
      const [memoryRes, docsRes, tasksRes] = await Promise.all([
        fetch("/api/memory/digest"),
        fetch("/api/docs/indexed"),
        fetch("/api/tasks"),
      ]);

      const memory = await memoryRes.json();
      const docs = await docsRes.json();
      const tasks = await tasksRes.json();

      // Build feed from various sources
      const feed: FeedEntry[] = [];

      // Add recent task completions
      if (tasks.topTask) {
        feed.push({
          id: `task-top-${Date.now()}`,
          agent: "KITTY",
          action: `Focus: ${tasks.topTask.content.slice(0, 50)}...`,
          timestamp: new Date().toISOString(),
          type: "task",
        });
      }

      // Simulate recent activity from memory/daily log
      // In production, this would parse actual agent activity from logs
      feed.push({
        id: `memory-${Date.now()}`,
        agent: "KITTY",
        action: "Memory consolidation complete",
        timestamp: new Date().toISOString(),
        type: "memory",
      });

      // Sort by timestamp descending, take last 5
      feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEntries(feed.slice(-5).reverse());
    } catch (e) {
      console.error("Failed to fetch swarm feed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const typeColors = {
    arrival: "text-violet border-violet/30",
    task: "text-moss border-moss/30",
    memory: "text-amber border-amber/30",
    system: "text-text-muted border-border",
  };

  const typeIcons = {
    arrival: "🌱",
    task: "✅",
    memory: "📡",
    system: "⚙️",
  };

  if (loading) {
    return (
      <Card className="bg-obsidian-light border-border p-4 rounded-xl">
        <div className="flex items-center gap-2 text-text-muted">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-mono">Loading swarm feed...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`flex items-center gap-3 p-2 rounded-lg border ${typeColors[entry.type]} bg-obsidian/30`}
        >
          <span className="text-sm">{typeIcons[entry.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-primary font-mono truncate">
              [{entry.agent}] {entry.action}
            </p>
          </div>
          <span className="text-xs text-text-muted font-mono flex-shrink-0">
            {formatTime(entry.timestamp)}
          </span>
        </div>
      ))}
      {entries.length === 0 && (
        <p className="text-text-muted text-xs font-mono text-center py-4">
          No recent activity...
        </p>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}