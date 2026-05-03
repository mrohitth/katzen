"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Calendar, Plus, X } from "lucide-react";

interface Task {
  content: string;
  status: "pending" | "done";
}

interface Toast {
  id: number;
  message: string;
}

interface TaskBoardProps {
  initialTasks: Task[];
  initialDate: string;
}

export default function TaskBoard({ initialTasks, initialDate }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dateStr, setDateStr] = useState(initialDate);
  const [newTask, setNewTask] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

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

    // Optimistic update - add to list immediately
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

      // Trigger revalidation
      startTransition(() => {
        // Force a re-render by updating state
        // The server component will be revalidated via revalidatePath
      });
    } catch (error) {
      // Rollback optimistic update
      setTasks((prev) => prev.filter((t) => t !== optimisticTask));
      addToast("[KITTY]: Failed to append task");
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-text-primary">Tasks</h1>
          <Badge variant="outline" className="border-moss text-moss font-mono text-xs">
            LIVE
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-text-secondary text-sm font-mono">
          <Calendar className="w-4 h-4" />
          <span>{dateStr}</span>
          <span className="text-text-muted">•</span>
          <span className="text-text-muted">
            {doneTasks.length}/{tasks.length} completed
          </span>
        </div>
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              pendingTasks.map((task, i) => (
                <Card
                  key={`${task.content}-${i}`}
                  className="bg-obsidian-light border-border p-4 rounded-xl glow-amber pulse-moss"
                >
                  <div className="flex items-start gap-3">
                    <Circle className="w-5 h-5 text-amber mt-0.5 flex-shrink-0" />
                    <p className="text-text-primary leading-relaxed font-system text-sm">
                      {task.content}
                    </p>
                  </div>
                </Card>
              ))
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
              doneTasks.map((task, i) => (
                <Card
                  key={`${task.content}-${i}`}
                  className="bg-obsidian-light border-border p-4 rounded-xl opacity-70"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-moss mt-0.5 flex-shrink-0" />
                    <p className="text-text-secondary leading-relaxed line-through font-system text-sm">
                      {task.content}
                    </p>
                  </div>
                </Card>
              ))
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
    </div>
  );
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