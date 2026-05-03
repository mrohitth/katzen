"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AnimatePresence, motion } from "framer-motion";
import {
  Terminal,
  Lightbulb,
  ChevronRight,
  Zap,
  AlertTriangle,
  Info,
  ArrowUp,
  CheckCircle,
} from "lucide-react";

interface Alert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
  source: string;
  agent: string;
  status_code: string;
}

interface Idea {
  id: string;
  cycle: string;
  title: string;
  description: string;
  status: "proposed" | "approved" | "rejected" | "implemented";
  proposed_at: string;
  votes: number;
  complexity_index: number;
}

type Tab = "logs" | "ideas";

function severityIcon(severity: string) {
  if (severity === "critical") return <AlertTriangle className="w-4 h-4 text-red-400" />;
  if (severity === "warning") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <Info className="w-4 h-4 text-moss" />;
}

function severityColor(severity: string) {
  if (severity === "critical") return "border-red-500/30 bg-red-500/5";
  if (severity === "warning") return "border-amber-500/30 bg-amber-500/5";
  return "border-moss/20 bg-moss/5";
}

function formatTimestamp(ts: string) {
  try {
    const d = new Date(ts);
    return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return ts;
  }
}

function CyberGridCard({ alert, index }: { alert: Alert; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm bg-obsidian-light/60 ${severityColor(
        alert.severity
      )}`}
    >
      <div className="mt-0.5 flex-shrink-0">{severityIcon(alert.severity)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-mono text-xs text-moss/80">
            [{formatTimestamp(alert.timestamp)}]
          </span>
          <Badge
            variant="secondary"
            className={`text-xs font-mono ${
              alert.severity === "critical"
                ? "bg-red-500/20 text-red-300"
                : alert.severity === "warning"
                ? "bg-amber-500/20 text-amber-300"
                : "bg-moss/20 text-moss"
            }`}
          >
            [{alert.agent}] [{alert.status_code}]
          </Badge>
        </div>
        <p className="text-sm text-text-primary leading-relaxed">{alert.message}</p>
      </div>
    </motion.div>
  );
}

function IdeaCard({
  idea,
  index,
  onVote,
  onApprove,
}: {
  idea: Idea;
  index: number;
  onVote: (id: string) => void;
  onApprove: (id: string) => void;
}) {
  const statusColor =
    idea.status === "approved"
      ? "border-moss/40 bg-moss/5"
      : idea.status === "rejected"
      ? "border-red-500/30 bg-red-500/5"
      : idea.status === "implemented"
      ? "border-violet/40 bg-violet/5"
      : "border-border bg-obsidian-light/60";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`p-5 rounded-xl border backdrop-blur-sm ${statusColor}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Lightbulb className="w-4 h-4 text-violet" />
          <Badge variant="secondary" className="bg-violet/20 text-violet/90 font-mono text-xs">
            {idea.cycle}
          </Badge>
          <Badge
            variant="secondary"
            className={`text-xs font-mono ${
              idea.status === "approved"
                ? "bg-moss/20 text-moss"
                : idea.status === "rejected"
                ? "bg-red-500/20 text-red-300"
                : idea.status === "implemented"
                ? "bg-violet/20 text-violet"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {idea.status}
          </Badge>
          <Badge variant="secondary" className="bg-obsidian text-text-muted font-mono text-xs">
            ⚡{idea.complexity_index}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVote(idea.id)}
            className="flex items-center gap-1 text-xs font-mono text-moss hover:text-moss/80 transition-colors"
          >
            <ArrowUp className="w-3 h-3" />
            <span>{idea.votes}</span>
          </button>
          {idea.status === "proposed" && (
            <button
              onClick={() => onApprove(idea.id)}
              className="flex items-center gap-1 text-xs font-mono text-violet hover:text-violet/80 transition-colors border border-violet/30 px-2 py-1 rounded"
            >
              <CheckCircle className="w-3 h-3" />
              APPROVE
            </button>
          )}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-2">{idea.title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed">{idea.description}</p>
      <div className="mt-3 text-xs font-mono text-text-muted">
        {idea.proposed_at
          ? new Date(idea.proposed_at).toISOString().replace("T", " ").slice(0, 19) +
            " UTC"
          : ""}
      </div>
    </motion.div>
  );
}

export default function AlertsPage() {
  const [tab, setTab] = useState<Tab>("logs");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const prevCriticalCount = useRef(0);
  const [pulseIcon, setPulseIcon] = useState(false);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.alerts ?? []);
        setIdeas(data.ideas ?? []);
        setLoading(false);
        prevCriticalCount.current = (data.alerts ?? []).filter(
          (a: Alert) => a.severity === "critical"
        ).length;
      })
      .catch(() => setLoading(false));
  }, []);

  // Pulse effect when new critical alert arrives
  useEffect(() => {
    const criticalCount = alerts.filter((a) => a.severity === "critical").length;
    if (criticalCount > prevCriticalCount.current) {
      setPulseIcon(true);
      setTimeout(() => setPulseIcon(false), 2000);
    }
    prevCriticalCount.current = criticalCount;
  }, [alerts]);

  const handleVote = async (id: string) => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote_idea", id }),
      });
      setIdeas((prev) =>
        prev.map((i) => (i.id === id ? { ...i, votes: i.votes + 1 } : i))
      );
    } catch {}
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_idea_status", id, status: "approved" }),
      });
      setIdeas((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "approved" } : i))
      );
      // Trigger Gateway build signal
      const idea = ideas.find((i) => i.id === id);
      if (idea) {
        await fetch("/api/alerts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_alert",
            agent: "GATEWAY",
            status_code: "BUILD",
            severity: "info",
            type: "system",
            message: `Build triggered for idea: ${idea.title} (${idea.cycle})`,
          }),
        });
        // Refresh alerts to show the build signal
        fetch("/api/alerts")
          .then((r) => r.json())
          .then((data) => setAlerts(data.alerts ?? []));
      }
    } catch {}
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Terminal className="w-6 h-6 text-moss" />
          <h1 className="text-2xl font-bold text-text-primary">Alerts & Ideas Hub</h1>
        </div>
        <p className="text-sm text-text-muted">
          Centralized feed — every entry: [Timestamp] [Agent] [Status_Code] [Message]
        </p>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-obsidian-light rounded-xl p-1 border border-border w-fit">
        <button
          onClick={() => setTab("logs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "logs"
              ? "bg-moss text-obsidian"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Terminal className="w-4 h-4" />
          Live Logs
          <Badge
            variant="secondary"
            className={`ml-1 bg-obsidian text-text-muted font-mono ${
              pulseIcon ? "animate-pulse" : ""
            }`}
          >
            {alerts.length}
          </Badge>
        </button>
        <button
          onClick={() => setTab("ideas")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "ideas"
              ? "bg-violet text-obsidian"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Innovation Lab
          <Badge variant="secondary" className="ml-1 bg-obsidian text-text-muted font-mono">
            {ideas.length}
          </Badge>
        </button>
      </div>

      <Separator className="mb-8 border-border/50" />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === "logs" && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <div className="text-center py-12 text-text-muted font-mono text-sm">
                Connecting to alert stream...
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12 text-text-muted font-mono text-sm">
                No alerts recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <CyberGridCard key={alert.id} alert={alert} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === "ideas" && (
          <motion.div
            key="ideas"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-6 p-4 rounded-xl border border-violet/30 bg-violet/5">
              <Zap className="w-4 h-4 text-violet" />
              <span className="text-sm font-mono text-violet/90">Project Kaizen — Active Cycle</span>
              <ChevronRight className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-mono text-text-muted">KP-002: Alerts & Ideas Hub</span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-text-muted font-mono text-sm">
                Loading innovation backlog...
              </div>
            ) : ideas.length === 0 ? (
              <div className="text-center py-12 text-text-muted font-mono text-sm">
                No ideas proposed yet.
              </div>
            ) : (
              <div className="space-y-4">
                {ideas.map((idea, i) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    index={i}
                    onVote={handleVote}
                    onApprove={handleApprove}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}