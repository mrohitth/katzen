"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Activity, Cpu, MemoryStick, Clock, Flower2, Zap, Snowflake } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  status: "active" | "idle" | "in_stasis" | "initializing";
  lastActive: string;
  color: string;
  glowClass: string;
}

export default function ZenOfficePage() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "kitty",
      name: "Kitty",
      emoji: "🧠",
      role: "Chief of Staff",
      status: "active",
      lastActive: "Just now",
      color: "moss",
      glowClass: "glow-moss",
    },
    {
      id: "titty",
      name: "Titty",
      emoji: "🌱",
      role: "Support Agent",
      status: "in_stasis",
      lastActive: "Pending",
      color: "amber",
      glowClass: "glow-amber",
    },
    {
      id: "bitty",
      name: "Bitty",
      emoji: "🌿",
      role: "Support Agent",
      status: "in_stasis",
      lastActive: "Pending",
      color: "amber",
      glowClass: "glow-amber",
    },
  ]);

  const [completedTasks, setCompletedTasks] = useState(0);
  const [flowers, setFlowers] = useState<number[]>([]);

  const fetchTaskCount = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      const done = data.doneCount || 0;
      setCompletedTasks(done);
      const bloomCount = Math.min(Math.floor(done / 3), 6);
      setFlowers(Array.from({ length: bloomCount }));
    } catch {
      setCompletedTasks(0);
      setFlowers([]);
    }
  }, []);

  useEffect(() => {
    fetchTaskCount();
    // Poll every 10 seconds for fresh data
    const interval = setInterval(fetchTaskCount, 10000);
    return () => clearInterval(interval);
  }, [fetchTaskCount]);

  return (
    <div className="p-8 min-h-screen relative overflow-hidden pb-24">
      {/* Mist Overlay Background */}
      <div className="absolute inset-0 mist-overlay pointer-events-none" />

      {/* Header */}
      <div className="mb-8 relative">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-text-primary">Zen Office</h1>
          <Badge variant="outline" className="border-violet text-violet font-mono text-xs">
            BIO-DIGITAL
          </Badge>
        </div>
        <p className="text-text-secondary text-sm">
          Agent activity visualization — organic, living, calm
        </p>
      </div>

      {/* Central Avatar Garden */}
      <div className="relative mb-8">
        <Card className="bg-obsidian-light border-border rounded-2xl p-8 mx-auto max-w-lg glow-violet">
          {/* 8-bit Kitty Avatar */}
          <div className="flex flex-col items-center">
            {/* Mist effect when no activity */}
            {flowers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-28 h-28 rounded-full bg-violet/10 animate-pulse" />
              </div>
            )}

            {/* 8-bit pixel art style avatar */}
            <div
              className="w-28 h-28 rounded-xl bg-gradient-to-br from-moss/30 to-violet/30 flex items-center justify-center relative mb-6"
              style={{
                boxShadow: "0 0 30px rgba(74, 222, 128, 0.3)",
              }}
            >
              <span className="text-6xl">🧠</span>
              {agents.filter((a) => a.status === "active").length > 0 && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-moss animate-pulse" />
              )}
            </div>

            {/* Flower Garden */}
            <div className="flex flex-wrap justify-center gap-2 mb-4 min-h-[40px]">
              {flowers.map((_, i) => (
                <span
                  key={i}
                  className="text-2xl bloom-flower"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  🌸
                </span>
              ))}
              {flowers.length === 0 && completedTasks === 0 && (
                <p className="text-text-muted text-xs font-mono text-center">
                  No blooms yet... complete tasks to grow the garden
                </p>
              )}
            </div>

            {/* Stats under avatar */}
            <div className="text-center">
              <p className="text-text-primary font-mono text-lg">
                {completedTasks} task{completedTasks !== 1 ? "s" : ""} done
              </p>
              <p className="text-text-muted text-xs">
                {flowers.length > 0
                  ? `${flowers.length} bloom${flowers.length !== 1 ? "s" : ""} growing`
                  : "Grow the garden by completing tasks"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Agent Incubators */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
          Agent Crew
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="relative">
              <Card
                className={`relative overflow-hidden rounded-2xl ${
                  agent.status === "active"
                    ? "bg-obsidian-light border-moss/30 glow-moss"
                    : agent.status === "in_stasis"
                    ? "bg-obsidian-light border-amber/30 glow-amber"
                    : "bg-obsidian-light border-border"
                }`}
              >
                {/* Mist Effect for in_stasis */}
                {(agent.status === "in_stasis" || agent.status === "initializing") && (
                  <div className="absolute inset-0 mist-overlay opacity-50" />
                )}

                <div className="p-6 relative">
                  {/* Agent Icon */}
                  <div className="flex items-center justify-center mb-4">
                    <div
                      className={`relative ${
                        agent.status === "active"
                          ? "animate-pulse"
                          : agent.status === "in_stasis"
                          ? "animate-pulse opacity-70"
                          : ""
                      }`}
                    >
                      <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl ${
                          agent.status === "active"
                            ? "bg-gradient-to-br from-moss/20 to-violet/20"
                            : agent.status === "in_stasis"
                            ? "bg-obsidian border-2 border-amber/30"
                            : "bg-obsidian"
                        }`}
                        style={
                          agent.status === "in_stasis"
                            ? { boxShadow: "0 0 15px rgba(251, 191, 36, 0.2)" }
                            : {}
                        }
                      >
                        {agent.emoji}
                      </div>
                      {agent.status === "active" && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-moss border-2 border-obsidian-light" />
                      )}
                      {agent.status === "in_stasis" && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber border-2 border-obsidian-light animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Agent Info */}
                  <div className="text-center">
                    <h3 className="text-text-primary font-medium mb-1">{agent.name}</h3>
                    <p className="text-text-muted text-xs mb-2">{agent.role}</p>
                    <Badge
                      variant="secondary"
                      className={`font-mono text-xs ${
                        agent.status === "active"
                          ? "bg-moss/10 text-moss border-moss/20"
                          : agent.status === "in_stasis"
                          ? "bg-amber/10 text-amber border-amber/20"
                          : "bg-obsidian text-text-muted"
                      }`}
                    >
                      {agent.status === "in_stasis" ? "IN STASIS" : agent.status.toUpperCase()}
                    </Badge>
                    <p className="text-text-muted text-xs font-mono mt-2">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {agent.lastActive}
                    </p>
                  </div>

                  {/* Status-specific decorations */}
                  {agent.status === "in_stasis" && (
                    <div className="absolute top-2 right-2">
                      <Snowflake className="w-4 h-4 text-amber/50 animate-pulse" />
                    </div>
                  )}
                  {agent.status === "active" && (
                    <div className="absolute top-2 right-2">
                      <Zap className="w-4 h-4 text-moss/50" />
                    </div>
                  )}
                </div>

                {/* Activity Glow for active */}
                {agent.status === "active" && (
                  <div className="absolute inset-0 bg-gradient-radial from-moss/5 to-transparent pointer-events-none" />
                )}
              </Card>

              {/* Incubator Progress Bar for in_stasis agents */}
              {agent.status === "in_stasis" && (
                <div className="mt-2 px-1">
                  <div className="h-1 bg-obsidian-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber/30 animate-pulse"
                      style={{ width: "30%" }}
                    />
                  </div>
                  <p className="text-text-muted text-xs text-center mt-1 font-mono">
                    Initializing...
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status Metrics */}
      <Card className="bg-obsidian-light border-border rounded-xl p-6 glow-violet">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
          System Pulse
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-moss/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-moss" />
            </div>
            <div>
              <p className="text-text-primary font-mono text-lg">
                {agents.filter((a) => a.status === "active").length}
              </p>
              <p className="text-text-muted text-xs">Active Agents</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-violet" />
            </div>
            <div>
              <p className="text-text-primary font-mono text-lg">204800</p>
              <p className="text-text-muted text-xs">Context Window</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center">
              <MemoryStick className="w-5 h-5 text-amber" />
            </div>
            <div>
              <p className="text-text-primary font-mono text-lg">
                {agents.filter((a) => a.status === "in_stasis").length}
              </p>
              <p className="text-text-muted text-xs">In Stasis</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Zen Garden Legend */}
      <div className="mt-8 text-center">
        <Separator className="mb-4 bg-border/50" />
        <div className="flex items-center justify-center gap-6 text-text-muted text-xs font-mono">
          <span>🧠 = Active</span>
          <span>🌱/🌿 = In Stasis (Initializing)</span>
          <span>🌸 = 3 completed tasks</span>
        </div>
        <p className="text-text-muted/50 text-xs mt-2">
          The garden grows with activity. Moss thrives when agents work. Amber glow indicates dormant potential.
        </p>
      </div>
    </div>
  );
}