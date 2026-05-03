import { getDailyTasks } from "@/lib/workspace";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { tasks, dateStr } = await getDailyTasks();

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
                  key={i}
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
                  key={i}
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