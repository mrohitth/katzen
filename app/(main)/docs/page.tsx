import { getMemoryFiles } from "@/lib/workspace";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileText, Hash, Clock, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const memoryFiles = await getMemoryFiles();

  // Filter to non-daily-log docs (AGENTS.md, SOUL.md, etc.)
  const workspaceFiles = [
    { name: "AGENTS.md", path: "/home/mathew/.openclaw/workspace/AGENTS.md", type: "system" },
    { name: "SOUL.md", path: "/home/mathew/.openclaw/workspace/SOUL.md", type: "personality" },
    { name: "USER.md", path: "/home/mathew/.openclaw/workspace/USER.md", type: "profile" },
    { name: "IDENTITY.md", path: "/home/mathew/.openclaw/workspace/IDENTITY.md", type: "identity" },
    { name: "MEMORY.md", path: "/home/mathew/.openclaw/workspace/MEMORY.md", type: "memory" },
    { name: "HEARTBEAT.md", path: "/home/mathew/.openclaw/workspace/HEARTBEAT.md", type: "config" },
    { name: "TOOLS.md", path: "/home/mathew/.openclaw/workspace/TOOLS.md", type: "config" },
    { name: "SPEC.md", path: "/home/mathew/.openclaw/workspace/SPEC.md", type: "project" },
  ];

  const typeColors: Record<string, string> = {
    system: "border-amber/30 text-amber",
    personality: "border-violet/30 text-violet",
    profile: "border-moss/30 text-moss",
    identity: "border-moss/30 text-moss",
    memory: "border-violet/30 text-violet",
    config: "border-text-muted/30 text-text-muted",
    project: "border-moss/30 text-moss",
    daily: "border-violet/30 text-violet",
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-text-primary">Docs</h1>
          <Badge variant="outline" className="border-moss text-moss font-mono text-xs">
            {workspaceFiles.length + memoryFiles.length} INDEXED
          </Badge>
        </div>
        <p className="text-text-secondary text-sm">
          Agent-generated documentation and workspace files
        </p>
      </div>

      {/* Workspace Docs */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
          Workspace Files
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {workspaceFiles.map((file) => (
            <Card
              key={file.name}
              className="bg-obsidian-light border-border p-4 rounded-xl hover:border-border/80 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                  typeColors[file.type]?.split(" ")[0] || "border-border"
                }`}>
                  <FileText className={`w-4 h-4 ${
                    typeColors[file.type]?.split(" ")[1] || "text-text-muted"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium group-hover:text-moss transition-colors">
                    {file.name}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`mt-1 font-mono text-xs ${typeColors[file.type]}`}
                  >
                    {file.type}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Daily Logs */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
          Daily Logs
        </h2>
        {memoryFiles.length === 0 ? (
          <ZenEmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {memoryFiles.map((file) => (
              <Card
                key={file.date}
                className="bg-obsidian-light border-border p-4 rounded-xl glow-violet hover:border-violet/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg border border-violet/30 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-violet" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium font-mono">
                      {file.date}
                    </p>
                    <p className="text-text-muted text-xs truncate">
                      {getFirstLine(file.content)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getFirstLine(content: string): string {
  const lines = content.split("\n").filter((l) => l.trim());
  const firstMeaningful = lines.find((l) => !l.startsWith("#"));
  return firstMeaningful?.slice(0, 50) || "Empty log";
}

function ZenEmptyState() {
  return (
    <Card className="bg-obsidian-light border-border/50 p-8 rounded-xl mist-overlay">
      <div className="text-center">
        <FileText className="w-6 h-6 text-violet/30 mx-auto mb-2" />
        <p className="text-text-muted text-xs font-mono">
          No daily logs yet...
        </p>
      </div>
    </Card>
  );
}