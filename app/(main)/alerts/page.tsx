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
  Loader2,
  CheckCheck,
  Cpu,
  CircleDot,
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
  model?: string;
  grouped?: boolean;
  count?: number;
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

interface BuildTask {
  agent: string;
  name: string;
  status: "pending" | "active" | "done" | "skipped";
}

interface Build {
  build_id: string;
  name: string;
  trend: string;
  frustration_score: number;
  commercial_intent: number;
  status: string;
  status_pct: number;
  started_at: string;
  tasks: BuildTask[];
}

type Tab = "logs" | "ideas" | "production";

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
  // Backend already sends EDT strings like "05/03/2026 19:21:04 EDT"
  // Return as-is if already in readable format (avoids double-conversion)
  if (!ts || ts.includes("EDT") || ts.includes("EST")) return ts;
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).replace("/", "-").replace("/", "-") + " EDT";
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
            {alert.model && <span className="text-violet/60 ml-1">[Model: {alert.model}]</span>}
          </Badge>
          {alert.grouped && alert.count && alert.count >= 2 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet/20 border border-violet/30 text-violet/90 font-mono text-xs font-semibold shadow-sm">
              ×{alert.count}
            </span>
          )}
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
  isApproving,
  isJustApproved,
}: {
  idea: Idea;
  index: number;
  onVote: (id: string) => void;
  onApprove: (id: string) => void;
  isApproving?: boolean;
  isJustApproved?: boolean;
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
              disabled={isApproving}
              className="flex items-center gap-1 text-xs font-mono text-violet hover:text-violet/80 transition-colors border border-violet/30 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  APPROVING
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3" />
                  APPROVE
                </>
              )}
            </button>
          )}
          {isJustApproved && (
            <span className="flex items-center gap-1 text-xs font-mono text-moss animate-pulse">
              <CheckCheck className="w-3 h-3" />
              APPROVED
            </span>
          )}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-2">{idea.title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed">{idea.description}</p>
      <div className="mt-3 text-xs font-mono text-text-muted">
        {idea.proposed_at
          ? (idea.proposed_at.includes("EDT") || idea.proposed_at.includes("EST")
              ? idea.proposed_at
              : new Date(idea.proposed_at).toLocaleString("en-US", {
                  timeZone: "America/New_York",
                  year: "numeric", month: "2-digit", day: "2-digit",
                  hour: "2-digit", minute: "2-digit", second: "2-digit",
                  hour12: false,
                }).replace("/", "-").replace("/", "-") + " EDT")
          : "—"}
      </div>
    </motion.div>
  );
}

export default function AlertsPage() {
  const [tab, setTab] = useState<Tab>("logs");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const prevCriticalCount = useRef(0);
  const [pulseIcon, setPulseIcon] = useState(false);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.alerts ?? []);
        setIdeas(data.ideas ?? []);
        setBuild(data.build ?? null);
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
    const optimistic = ideas.find((i) => i.id === id)?.votes ?? 0;
    // Optimistic update immediately
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...i, votes: i.votes + 1 } : i))
    );
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote_idea", id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Revert optimistic update on failure
      setIdeas((prev) =>
        prev.map((i) => (i.id === id ? { ...i, votes: optimistic } : i))
      );
      console.error("[handleVote]", err);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const idea = ideas.find((i) => i.id === id);
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_idea_status", id, status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(`❌ Error: ${data.message ?? "Unknown error"}`);
        return;
      }
      setIdeas((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "approved" } : i))
      );
      setApprovedId(id);
      showToast(`✅ "${idea?.title}" approved — build pipeline triggered`);

      // Fire build signal alert
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_alert",
          agent: "KITTY",
          status_code: "BUILD",
          severity: "info",
          type: "system",
          message: `Build approved: ${idea?.title} (${idea?.cycle})`,
        }),
      });
      fetch("/api/alerts")
        .then((r) => r.json())
        .then((data) => setAlerts(data.alerts ?? []));

      setTimeout(() => setApprovedId(null), 3000);
    } catch {
      showToast("❌ Network error — could not approve");
    } finally {
      setApprovingId(null);
    }
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
        <button
          onClick={() => setTab("production")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "production"
              ? "bg-amber text-obsidian"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Cpu className="w-4 h-4" />
          ⚡ PRODUCTION
          <Badge variant="secondary" className="ml-1 bg-obsidian text-text-muted font-mono">
            {build ? "LIVE" : "OFF"}
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

        {tab === "production" && (
          <motion.div
            key="production"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ProductionTab build={build} loading={loading} />
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
            <InnovationLabTab
              ideas={ideas}
              loading={loading}
              approvingId={approvingId}
              approvedId={approvedId}
              onVote={handleVote}
              onApprove={handleApprove}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductionTab({ build, loading }: { build: Build | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="text-center py-12 text-text-muted font-mono text-sm">
        Connecting to build pipeline...
      </div>
    );
  }

  if (!build) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl border border-amber/20 bg-amber/5 flex items-center justify-center">
          <CircleDot className="w-8 h-8 text-amber/40" />
        </div>
        <div className="text-center">
          <p className="text-text-muted font-mono text-sm">PRODUCTION DORMANT</p>
          <p className="text-text-muted/60 text-xs mt-1">
            Live Build Card activates when TrendScout fires at 10 AM ET
          </p>
        </div>
      </div>
    );
  }

  const pct = build.status_pct ?? 0;
  const barColor = pct === 100 ? "bg-moss" : "bg-amber";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-amber/30 bg-amber/5">
        <div className="w-3 h-3 rounded-full bg-amber animate-pulse" />
        <span className="font-mono text-xs text-amber/80">⚡ ACTIVE BUILD</span>
        <ChevronRight className="w-4 h-4 text-text-muted" />
        <span className="font-mono text-sm text-text-primary">{build.name}</span>
      </div>

      {/* Build ID + Scores */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-obsidian-light/60">
          <p className="text-xs font-mono text-text-muted mb-1">BUILD ID</p>
          <p className="font-mono text-xs text-moss/80">{build.build_id}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-obsidian-light/60">
          <p className="text-xs font-mono text-text-muted mb-1">FRUSTRATION</p>
          <p className="font-mono text-lg text-amber font-bold">{build.frustration_score}/10</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-obsidian-light/60">
          <p className="text-xs font-mono text-text-muted mb-1">COMMERCIAL INTENT</p>
          <p className="font-mono text-lg text-violet font-bold">{build.commercial_intent}/10</p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-text-secondary">{build.status?.toUpperCase()}</span>
          <span className="text-amber">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-obsidian-light border border-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Task Checklist */}
      <div className="space-y-2">
        <p className="text-xs font-mono text-text-muted mb-3">SUB-TASKS</p>
        {build.tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-obsidian-light/40">
            <span className="w-5 flex items-center justify-center">
              {task.status === "done" && <CheckCircle className="w-4 h-4 text-moss" />}
              {task.status === "active" && <Loader2 className="w-4 h-4 text-amber animate-spin" />}
              {task.status === "pending" && <CircleDot className="w-4 h-4 text-text-muted/40" />}
              {task.status === "skipped" && <span className="text-text-muted/40 text-xs">—</span>}
            </span>
            <span className={`text-sm font-mono ${
              task.status === "done" ? "text-moss/80 line-through" :
              task.status === "active" ? "text-amber" :
              "text-text-muted"
            }`}>
              [{task.agent}] {task.name}
            </span>
            {task.status === "active" && (
              <span className="ml-auto text-xs font-mono text-amber/60 animate-pulse">RUNNING</span>
            )}
            {task.status === "done" && (
              <span className="ml-auto text-xs font-mono text-moss/60">DONE</span>
            )}
          </div>
        ))}
      </div>

      {/* Trend context */}
      {build.trend && (
        <div className="p-4 rounded-xl border border-violet/20 bg-violet/5">
          <p className="text-xs font-mono text-violet/60 mb-1">TREND</p>
          <p className="text-sm text-text-secondary">{build.trend}</p>
        </div>
      )}

      <div className="text-xs font-mono text-text-muted/60">
        Started: {build.started_at}
      </div>
    </div>
  );
}

// Extracted Ideas tab — InnovationLab
function InnovationLabTab({
  ideas,
  loading,
  approvingId,
  approvedId,
  onVote,
  onApprove,
}: {
  ideas: Idea[];
  loading: boolean;
  approvingId: string | null;
  approvedId: string | null;
  onVote: (id: string) => void;
  onApprove: (id: string) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 mb-6 p-4 rounded-xl border border-violet/30 bg-violet/5">
        <Zap className="w-4 h-4 text-violet" />
        <span className="text-sm font-mono text-violet/90">Project Kaizen — Active Cycle</span>
        <ChevronRight className="w-4 h-4 text-text-muted" />
        <span className="text-sm font-mono text-text-muted">KP-003: Smart Alert Grouping</span>
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
              onVote={onVote}
              onApprove={onApprove}
              isApproving={approvingId === idea.id}
              isJustApproved={approvedId === idea.id}
            />
          ))}
        </div>
      )}
    </>
  );
}