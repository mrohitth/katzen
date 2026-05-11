"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";

interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  emoji: string;
  status: "online" | "offline" | "warning";
  last_seen: string;
  heartbeat: string | null;
}

interface AgentsResponse {
  agents: Agent[];
  last_updated: string;
  schema_violations?: string[];
}

function AgentCard({ agent }: { agent: Agent }) {
  const statusColor =
    agent.status === "online"
      ? "border-moss/30 bg-moss/5"
      : agent.status === "offline"
      ? "border-red-500/30 bg-red-500/5"
      : "border-amber-500/30 bg-amber-500/5";

  const dotColor =
    agent.status === "online"
      ? "bg-moss"
      : agent.status === "offline"
      ? "bg-red-500"
      : "bg-amber-500";

  const statusText =
    agent.status === "online"
      ? "Online"
      : agent.status === "offline"
      ? "Offline"
      : "Warning";

  const modelShort = agent.model.split("/").pop() ?? agent.model;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-5 rounded-xl border backdrop-blur-sm ${statusColor}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{agent.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">{agent.name}</h3>
              <span className={`w-2 h-2 rounded-full ${dotColor} ${agent.status === "online" ? "animate-pulse" : ""}`} />
            </div>
            <p className="text-xs text-text-muted font-mono">{agent.role}</p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={`text-xs font-mono ${
            agent.status === "online"
              ? "bg-moss/20 text-moss"
              : agent.status === "offline"
              ? "bg-red-500/20 text-red-300"
              : "bg-amber-500/20 text-amber-300"
          }`}
        >
          {statusText}
        </Badge>
      </div>

      <div className="space-y-2 text-xs font-mono text-text-muted">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Model</span>
          <span className="text-text-primary truncate ml-2 max-w-[160px]">{modelShort}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Last seen</span>
          <span className="text-text-primary">
            {agent.last_seen
              ? new Date(agent.last_seen).toISOString().replace("T", " ").slice(0, 16) + " UTC"
              : "—"}
          </span>
        </div>
        {agent.id === "bitty" && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-amber-400/80 text-[10px]">🌿 Local inference — zero cloud cost</span>
          </div>
        )}
        {agent.id === "capital" && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-violet/80 text-[10px]">📈 MarketBot — Telegram daily brief</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AgentsTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [violations, setViolations] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data: AgentsResponse) => {
        setAgents(data.agents ?? []);
        setLastUpdated(data.last_updated ?? null);
        setViolations(data.schema_violations ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const onlineCount = agents.filter((a) => a.status === "online").length;

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🤖</span>
          <h1 className="text-2xl font-bold text-text-primary">Agent Crew</h1>
          {violations.length > 0 && (
            <Badge variant="secondary" className="bg-red-500/20 text-red-300 font-mono text-xs">
              ⚠ {violations.length} schema violation{violations.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <p className="text-sm text-text-muted">
          {loading
            ? "Connecting to agent registry..."
            : `${onlineCount}/${agents.length} agents online — last sync ${lastUpdated ? new Date(lastUpdated).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "—"}`}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-text-muted font-mono text-sm">
          Loading agent registry...
        </div>
      ) : (
        <>
          {violations.length > 0 && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
              <p className="text-xs font-mono text-red-300 mb-2">⚠ SYNC_AUDIT — Schema Violations:</p>
              {violations.map((v, i) => (
                <p key={i} className="text-xs font-mono text-red-400/80">{v}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-6 p-4 rounded-xl border border-border bg-obsidian-light/40">
            <p className="text-xs font-mono text-text-muted">
              🤖 Agent registry synced by{" "}
              <span className="text-moss">Witty</span> via Katzen-Sync (every 15 min).
              Bitty status reflects local Ollama reachability. All cloud agents use
              allowlisted models from{" "}
              <span className="text-violet/80">agents.defaults.models</span>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
