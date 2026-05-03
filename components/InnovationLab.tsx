"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import {
  Lightbulb,
  ChevronRight,
  Zap,
  ArrowUp,
  CheckCircle,
  Loader2,
  CheckCheck,
} from "lucide-react";

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

interface InnovationLabProps {
  onStatusChange?: (id: string, status: string) => void;
}

export default function InnovationLab({ onStatusChange }: InnovationLabProps) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => {
        setIdeas(data.ideas ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

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
    setApprovingId(id);
    try {
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
      const idea = ideas.find((i) => i.id === id);
      setIdeas((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "approved" } : i))
      );
      setApprovedId(id);
      onStatusChange?.(id, "approved");
      showToast(`✅ "${idea?.title}" approved — build triggered`);

      // Fire build signal alert
      if (idea) {
        await fetch("/api/alerts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_alert",
            agent: "KITTY",
            status_code: "BUILD",
            severity: "info",
            type: "system",
            message: `Build approved: ${idea.title} (${idea.cycle})`,
          }),
        });
      }
      setTimeout(() => setApprovedId(null), 3000);
    } catch {
      showToast("❌ Network error — could not approve");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8, x: "-50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-8 left-1/2 z-50 px-4 py-2 rounded-xl bg-obsidian-light/95 border border-moss/30 text-sm font-mono text-moss shadow-lg backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

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
                onVote={handleVote}
                onApprove={handleApprove}
                isApproving={approvingId === idea.id}
                isJustApproved={approvedId === idea.id}
              />
            ))}
          </div>
        )}
      </motion.div>
    </>
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
  isApproving: boolean;
  isJustApproved: boolean;
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
      className={`p-5 rounded-xl border backdrop-blur-sm ${statusColor} ${
        isJustApproved ? "ring-1 ring-moss/40" : ""
      }`}
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
          {idea.status === "approved" && isJustApproved && (
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
          ? new Date(idea.proposed_at).toISOString().replace("T", " ").slice(0, 19) + " UTC"
          : ""}
      </div>
    </motion.div>
  );
}