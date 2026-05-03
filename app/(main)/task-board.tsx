"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Plus, X, Edit2, Check, XCircle, Clock } from "lucide-react";

interface Task {
  content: string;
  status: "pending" | "done";
  assigned?: "K" | "T" | "B";
  completedAt?: string; // ISO timestamp
  project?: string;
}

interface TaskWithETA extends Task {
  estimatedMinutes?: number; // null means cannot estimate
}

interface Toast {
  id: number;
  message: string;
}

interface TaskBoardProps {
  initialTasks: Task[];
  initialDate: string;
}

interface SearchResult {
  snippet: string;
  file: string;
}

export default function TaskBoard({ initialTasks, initialDate }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dateStr] = useState(initialDate);
  const [newTask, setNewTask] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipContent, setTooltipContent] = useState<SearchResult | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [scheduledJobs, setScheduledJobs] = useState<{
    id: string; name: string; schedule: string; scheduleKind: string;
    nextRun: string | null; nextRunMs: number | null; status: string; delivery: string;
  }[]>([]);
  const [lastFetchAt, setLastFetchAt] = useState<number>(Date.now());

  // Refresh tasks when window regains focus (catches changes from other sessions/cron)
  useEffect(() => {
    const handleFocus = () => {
      fetch("/api/tasks")
        .then((r) => r.json())
        .then((data) => {
          if (!data.error && data.tasks) {
            setTasks(data.tasks);
            setLastFetchAt(Date.now());
          }
        })
        .catch(console.error);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Fetch scheduled jobs once on mount
  useEffect(() => {
    fetch("/api/scheduler")
      .then((r) => r.json())
      .then((data) => { if (!data.error && data.jobs) setScheduledJobs(data.jobs); })
      .catch(console.error);
  }, []);

  const addToast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const taskContent = newTask.trim();
    if (!taskContent) return;

    const optimisticTask: Task = { content: taskContent, status: "pending" };
    setTasks((prev) => [...prev, optimisticTask]);
    setNewTask("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskContent }),
      });

      if (!res.ok) throw new Error("Failed to add task");

      addToast("[KITTY]: Task appended to daily log");
    } catch (error) {
      setTasks((prev) => prev.filter((t) => t !== optimisticTask));
      addToast("[KITTY]: Failed to append task");
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(tasks[index].content);
  };

  const handleSaveEdit = async (index: number) => {
    const oldTask = tasks[index];
    const newContent = editValue.trim();

    if (!newContent || newContent === oldTask.content) {
      setEditingIndex(null);
      return;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, content: newContent } : t))
    );
    setEditingIndex(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldContent: oldTask.content, newContent }),
      });

      if (!res.ok) throw new Error("Failed to update task");
      addToast("[KITTY]: Task updated");
    } catch (error) {
      // Rollback
      setTasks((prev) =>
        prev.map((t, i) => (i === index ? oldTask : t))
      );
      addToast("[KITTY]: Failed to update task");
    }
  };

  const handleToggleStatus = async (index: number) => {
    const task = tasks[index];
    const newStatus = task.status === "pending" ? "done" : "pending";

    // Optimistic update
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldContent: task.content,
          newStatus: newStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle task");
      addToast(`[KITTY]: Task marked ${newStatus}`);
    } catch (error) {
      // Rollback
      setTasks((prev) =>
        prev.map((t, i) => (i === index ? task : t))
      );
      addToast("[KITTY]: Failed to toggle task");
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  // Search for context tooltip on hover
  const handleMouseEnter = async (index: number, event: React.MouseEvent) => {
    const task = tasks[index];
    if (task.status === "done") {
      setHoveredIndex(index);
      setTooltipPosition({ x: event.clientX, y: event.clientY });

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(task.content.slice(0, 30))}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          if (result.matches && result.matches.length > 0) {
            setTooltipContent({
              snippet: result.matches[0].snippet,
              file: result.file,
            });
          }
        }
      } catch {
        setTooltipContent(null);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipContent(null);
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  // Done tasks sorted by timestamp descending (most recent first)
  const doneTasks = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => {
      if (!a.completedAt && !b.completedAt) return 0;
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });

  return (
    <>
      {/* Quick Add Input */}
      <form onSubmit={handleAddTask} className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a task and press Enter..."
            className="w-full bg-obsidian-light border border-border rounded-xl px-4 py-3 pl-12 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-moss focus:ring-1 focus:ring-moss/30 transition-all font-mono text-sm"
            disabled={isPending}
          />
          <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          {newTask && (
            <button
              type="button"
              onClick={() => setNewTask("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Pending
            </h2>
            <Badge variant="secondary" className="bg-obsidian-light text-text-muted font-mono">
              {pendingTasks.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {pendingTasks.length === 0 ? (
              <ZenEmptyState type="pending" />
            ) : (
              pendingTasks.map((task, i) => {
                const actualIndex = tasks.findIndex((t) => t === task);
                const estimatedMinutes = estimateTaskMinutes(task.content);
                return (
                  <Card
                    key={`${task.content}-${i}`}
                    className="bg-obsidian-light border-border p-4 rounded-xl glow-amber pulse-moss group"
                    onMouseEnter={(e) => handleMouseEnter(actualIndex, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="flex items-start gap-3">
                      {editingIndex === actualIndex ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 bg-obsidian border border-border rounded px-2 py-1 text-text-primary font-mono text-sm focus:outline-none focus:border-moss"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(actualIndex);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(actualIndex)}
                            className="text-moss hover:bg-moss/10 p-1 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="text-text-muted hover:bg-obsidian p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(actualIndex)}
                            className="mt-0.5"
                          >
                            <Circle className="w-5 h-5 text-amber flex-shrink-0" />
                          </button>
                          <p
                            className="flex-1 text-text-primary leading-relaxed font-system text-sm cursor-pointer hover:text-moss transition-colors"
                            onClick={() => handleStartEdit(actualIndex)}
                          >
                            {task.content}
                          </p>
                          {estimatedMinutes && (
                            <span className="text-xs font-mono text-violet/70 bg-violet/10 px-1.5 py-0.5 rounded border border-violet/20 flex-shrink-0" title="Estimated completion time">
                              ~{estimatedMinutes}m
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(actualIndex)}
                            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-moss transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Done Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-moss" />
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Done
            </h2>
            <Badge variant="secondary" className="bg-obsidian-light text-text-muted font-mono">
              {doneTasks.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {doneTasks.length === 0 ? (
              <ZenEmptyState type="done" />
            ) : (
              doneTasks.map((task, i) => {
                const actualIndex = tasks.findIndex((t) => t === task);
                return (
                  <Card
                    key={`${task.content}-${i}`}
                    className="bg-obsidian-light border-border p-4 rounded-xl opacity-70 group"
                    onMouseEnter={(e) => handleMouseEnter(actualIndex, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="flex items-start gap-3">
                      {editingIndex === actualIndex ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 bg-obsidian border border-border rounded px-2 py-1 text-text-primary font-mono text-sm focus:outline-none focus:border-moss"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(actualIndex);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(actualIndex)}
                            className="text-moss hover:bg-moss/10 p-1 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="text-text-muted hover:bg-obsidian p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(actualIndex)}
                            className="mt-0.5"
                          >
                            <CheckCircle2 className="w-5 h-5 text-moss flex-shrink-0" />
                          </button>
                          <p
                            className="flex-1 text-text-secondary leading-relaxed line-through font-system text-sm cursor-pointer hover:text-moss transition-colors"
                            onClick={() => handleStartEdit(actualIndex)}
                          >
                            {task.content}
                          </p>
                          {task.completedAt && (
                            <span
                              className="text-text-muted text-xs font-mono opacity-70 flex-shrink-0"
                              title={new Date(task.completedAt).toLocaleString()}
                            >
                              {new Date(task.completedAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(actualIndex)}
                            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-moss transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Scheduled Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-violet animate-pulse" />
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Scheduled
            </h2>
            <Badge variant="secondary" className="bg-obsidian-light text-text-muted font-mono">
              {scheduledJobs.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {scheduledJobs.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No scheduled jobs</p>
              </div>
            ) : (
              scheduledJobs.map((job) => {
                const nextRun = job.nextRun ? new Date(job.nextRun) : null;
                const isCron = job.scheduleKind === "cron";
                let scheduleLabel = isCron ? job.schedule : "";
                if (!isCron) {
                  try { scheduleLabel = `${(JSON.parse(job.schedule || "{}").everyMs || 0)/60000}m`; } catch {}
                }
                return (
                  <Card key={job.id} className="bg-obsidian-light border-violet/30 p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-violet flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium leading-relaxed">
                          {job.name}
                        </p>
                        <p className="text-text-muted text-xs font-mono mt-0.5">{scheduleLabel}</p>
                        {nextRun && (
                          <p className="text-violet/70 text-xs font-mono mt-1">
                            Next: {nextRun.toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"})}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`font-mono text-xs flex-shrink-0 ${
                          job.status === "disabled" ? "bg-obsidian text-text-muted" : "bg-violet/10 text-violet border-violet/20"
                        }`}
                      >
                        {job.status === "disabled" ? "off" : "cron"}
                      </Badge>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Growth indicator */}
      {doneTasks.length > 0 && (
        <div className="mt-8 flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(doneTasks.length, 5) }).map((_, i) => (
              <span key={i} className="text-moss text-lg bloom-flower" style={{ animationDelay: `${i * 100}ms` }}>
                🌸
              </span>
            ))}
          </div>
          <p className="text-text-muted text-xs font-mono">
            {doneTasks.length} task{doneTasks.length !== 1 ? "s" : ""} completed — garden is growing
          </p>
        </div>
      )}

      {/* Activity Log Toast */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-obsidian-light border border-moss/30 px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2"
          >
            <p className="text-moss text-sm font-mono">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Context Tooltip */}
      {hoveredIndex !== null && tooltipContent && (
        <div
          className="fixed z-50 bg-obsidian-light border border-violet/30 px-3 py-2 rounded-lg shadow-lg max-w-sm pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10,
          }}
        >
          <p className="text-xs text-text-muted font-mono mb-1">{tooltipContent.file}</p>
          <p className="text-sm text-text-secondary" dangerouslySetInnerHTML={{ __html: tooltipContent.snippet }} />
        </div>
      )}
    </>
  );
}

function estimateTaskMinutes(content: string): number | null {
  // Returns estimated minutes, or null if cannot estimate
  const c = content.toLowerCase();

  // Explicit time mentions
  const explicit = /(\d+)\s*(min|minute|hour|hr|hr|h)\b/i.exec(content);
  if (explicit) {
    const val = parseInt(explicit[1]);
    if (/hour|hr/i.test(explicit[2])) return val * 60;
    return val;
  }

  // Simple microtasks: < 2 min
  if (/delete|fix typo|remove\s+comment|tiny|temp|quick/i.test(c)) return 1;

  // Short tasks: 2-5 min
  if (/update\s+readme|add\s+comment|clean|cleanup|refresh|test\s+local|ping|check\s+status|fix\s+lint/i.test(c)) return 3;

  // Medium tasks: 5-15 min
  if (/implement|add\s+feature|build|create\s+component|write\s+test|document|review|read\s+doc|setup\s+env/i.test(c)) return 10;

  // Larger tasks: 15-30 min
  if (/architect|design|refactor|migrate|integrate|setup\s+project|build\s+from\s+scratch|write\s+spec/i.test(c)) return 20;

  // Complex tasks: 30+ min
  if (/research|analyze|study|benchmark|build\s+pipeline|full\s+stack|end\s+to\s+end|multi/i.test(c)) return 45;

  // Default: no estimate
  return null;
}

function ZenEmptyState({ type }: { type: "pending" | "done" }) {
  return (
    <div className="relative">
      <Card className="bg-obsidian-light border-border/50 p-8 rounded-xl mist-overlay">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-3">
              {type === "pending" ? "○" : "✓"}
            </div>
            <p className="text-text-muted text-sm font-mono">
              {type === "pending"
                ? "Waiting to grow..."
                : "Nothing completed yet"}
            </p>
          </div>
        </div>
        <div className="invisible">
          <div className="h-4" />
        </div>
      </Card>
    </div>
  );
}