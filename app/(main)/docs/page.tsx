"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  FileText,
  Clock,
  Archive,
  Folder,
  X,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileCode,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocFile {
  name: string;
  path: string;
  type: string;
  category: string;
  date?: string;
  isStatic?: boolean;
  isWeeklyReport?: boolean;
}

// ─── File Viewer Modal ─────────────────────────────────────────────────────────

interface ViewerModalProps {
  file: DocFile;
  content: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

function ViewerModal({ file, content, loading, error, onClose }: ViewerModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] bg-obsidian-light border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-lg border border-violet/30 bg-violet/10 flex items-center justify-center">
            <FileCode className="w-4 h-4 text-violet" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-mono text-sm font-medium truncate">{file.name}</p>
            <p className="text-text-muted text-xs font-mono truncate">
              {file.type === "daily" ? `memory/${file.date}.md` :
               file.type === "weekly" ? "Auto-Generated Report" :
               file.path.replace("/home/mathew/.openclaw/workspace/", "")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-obsidian text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 text-violet animate-spin" />
              <span className="text-text-muted text-sm font-mono">Loading file...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-16 gap-3">
              <AlertCircle className="w-5 h-5 text-amber" />
              <span className="text-text-muted text-sm font-mono">{error}</span>
            </div>
          )}
          {!loading && !error && content !== null && (
            <pre className="p-6 text-text-secondary font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
              {content}
            </pre>
          )}
        </div>
        <div className="px-6 py-3 border-t border-border flex items-center justify-between flex-shrink-0">
          <Badge variant="secondary" className="bg-obsidian text-text-muted border-border font-mono text-xs">
            {file.type} · {file.category}
          </Badge>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-obsidian border border-border text-text-muted text-xs font-mono hover:text-text-primary hover:border-text-muted/50 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Doc Card ─────────────────────────────────────────────────────────────────

interface DocCardProps {
  file: DocFile;
  onView: (file: DocFile) => void;
  typeColors: Record<string, { border: string; text: string; icon: string }>;
  showDate?: boolean;
}

function DocCard({ file, onView, typeColors, showDate }: DocCardProps) {
  const tc = typeColors[file.type] || typeColors.daily;

  return (
    <Card
      className="bg-obsidian-light border-border p-4 rounded-xl hover:border-border/80 transition-all group cursor-pointer"
      onClick={() => onView(file)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg border ${tc.border} flex items-center justify-center bg-obsidian flex-shrink-0`}>
          <span className={`text-lg ${tc.text}`}>{tc.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-text-primary text-sm font-medium group-hover:text-moss transition-colors">{file.name}</p>
            <ChevronRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          <Badge variant="secondary" className={`mt-1 font-mono text-xs ${tc.border} ${tc.text} bg-transparent`}>
            {file.category}
          </Badge>
          {showDate && file.date && (
            <p className="text-text-muted text-xs font-mono mt-1">{file.date}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [memoryFiles, setMemoryFiles] = useState<{ date: string; path: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewerFile, setViewerFile] = useState<DocFile | null>(null);
  const [viewerContent, setViewerContent] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  const staticDocs: DocFile[] = [
    { name: "AGENTS.md", path: "/home/mathew/.openclaw/workspace/AGENTS.md", type: "system", category: "Static", isStatic: true },
    { name: "SOUL.md", path: "/home/mathew/.openclaw/workspace/SOUL.md", type: "personality", category: "Static", isStatic: true },
    { name: "USER.md", path: "/home/mathew/.openclaw/workspace/USER.md", type: "profile", category: "Static", isStatic: true },
    { name: "IDENTITY.md", path: "/home/mathew/.openclaw/workspace/IDENTITY.md", type: "identity", category: "Static", isStatic: true },
    { name: "MEMORY.md", path: "/home/mathew/.openclaw/workspace/MEMORY.md", type: "memory", category: "Static", isStatic: true },
    { name: "HEARTBEAT.md", path: "/home/mathew/.openclaw/workspace/HEARTBEAT.md", type: "config", category: "Static", isStatic: true },
    { name: "TOOLS.md", path: "/home/mathew/.openclaw/workspace/TOOLS.md", type: "config", category: "Static", isStatic: true },
    { name: "SPEC.md", path: "/home/mathew/.openclaw/workspace/SPEC.md", type: "project", category: "Static", isStatic: true },
    { name: "DREAMS.md", path: "/home/mathew/.openclaw/workspace/DREAMS.md", type: "roadmap", category: "Static", isStatic: true },
  ];

  const autoGeneratedReports: DocFile[] = [
    { name: "Weekly Report (2026-05-03)", path: "/api/docs/generate", type: "weekly", category: "Auto-Generated", date: "2026-05-03", isWeeklyReport: true },
  ];

  const typeColors: Record<string, { border: string; text: string; icon: string }> = {
    system: { border: "border-amber/30", text: "text-amber", icon: "⚙️" },
    personality: { border: "border-violet/30", text: "text-violet", icon: "🧠" },
    profile: { border: "border-moss/30", text: "text-moss", icon: "👤" },
    identity: { border: "border-moss/30", text: "text-moss", icon: "🔮" },
    memory: { border: "border-violet/30", text: "text-violet", icon: "📡" },
    config: { border: "border-text-muted/30", text: "text-text-muted", icon: "🔧" },
    project: { border: "border-moss/30", text: "text-moss", icon: "🚀" },
    roadmap: { border: "border-amber/30", text: "text-amber", icon: "🗺️" },
    weekly: { border: "border-violet/30", text: "text-violet", icon: "📊" },
    daily: { border: "border-violet/30", text: "text-violet", icon: "📝" },
  };

  useEffect(() => {
    fetch("/api/memory/files")
      .then((r) => r.json())
      .then((files: { date: string; path: string }[]) => setMemoryFiles(files))
      .catch((err) => console.error("Failed to load memory files:", err))
      .finally(() => setLoading(false));
  }, []);

  const dailyLogs: DocFile[] = memoryFiles.map((f) => ({
    name: f.date,
    path: `/api/docs/daily/${f.date}`,
    type: "daily",
    category: "Daily Log",
    date: f.date,
    isStatic: false,
  }));

  // ── View handler ──────────────────────────────────────────────────────────

  const handleView = useCallback(async (file: DocFile) => {
    setViewerFile(file);
    setViewerContent(null);
    setViewerError(null);
    setViewerLoading(true);

    try {
      let url = "";
      if (file.isStatic) {
        url = `/api/docs/static?path=${encodeURIComponent(file.path)}`;
      } else if (file.isWeeklyReport) {
        url = `/api/docs/generate?week=2026-05-03&raw=1`;
      } else if (file.type === "daily" && file.date) {
        url = `/api/docs/daily/${file.date}`;
      } else {
        throw new Error("Unknown file type");
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setViewerContent(text);
    } catch (err: any) {
      setViewerError(err.message || "Failed to load file");
    } finally {
      setViewerLoading(false);
    }
  }, []);

  const totalDocs = staticDocs.length + dailyLogs.length + autoGeneratedReports.length;

  return (
    <>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-text-primary">Docs</h1>
            <Badge variant="outline" className="border-moss text-moss font-mono text-xs">
              {totalDocs} INDEXED
            </Badge>
          </div>
          <p className="text-text-secondary text-sm">
            Agent-generated documentation and workspace files — click any card to view
          </p>
        </div>

        {/* Auto-Generated Reports */}
        {autoGeneratedReports.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Archive className="w-4 h-4 text-violet" />
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                Auto-Generated Reports
              </h2>
              <Badge variant="secondary" className="bg-violet/10 text-violet border-violet/20 font-mono text-xs">
                {autoGeneratedReports.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {autoGeneratedReports.map((report) => (
                <DocCard key={report.name} file={report} onView={handleView} typeColors={typeColors} showDate />
              ))}
            </div>
          </div>
        )}

        {/* Static Docs */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Folder className="w-4 h-4 text-moss" />
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Static Docs
            </h2>
            <Badge variant="secondary" className="bg-moss/10 text-moss border-moss/20 font-mono text-xs">
              {staticDocs.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {staticDocs.map((file) => (
              <DocCard key={file.name} file={file} onView={handleView} typeColors={typeColors} />
            ))}
          </div>
        </div>

        {/* Daily Logs */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-violet" />
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Daily Logs
            </h2>
            <Badge variant="secondary" className="bg-violet/10 text-violet border-violet/20 font-mono text-xs">
              {dailyLogs.length}
            </Badge>
          </div>
          {loading ? (
            <ZenLoadingState />
          ) : dailyLogs.length === 0 ? (
            <ZenEmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dailyLogs.map((file) => (
                <DocCard key={file.date} file={file} onView={handleView} typeColors={typeColors} showDate />
              ))}
            </div>
          )}
        </div>
      </div>

      {viewerFile && (
        <ViewerModal
          file={viewerFile}
          content={viewerContent}
          loading={viewerLoading}
          error={viewerError}
          onClose={() => setViewerFile(null)}
        />
      )}
    </>
  );
}

function ZenLoadingState() {
  return (
    <Card className="bg-obsidian-light border-border/50 p-8 rounded-xl">
      <div className="flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 text-violet animate-spin" />
        <p className="text-text-muted text-xs font-mono">Loading daily logs...</p>
      </div>
    </Card>
  );
}

function ZenEmptyState() {
  return (
    <Card className="bg-obsidian-light border-border/50 p-8 rounded-xl mist-overlay">
      <div className="text-center">
        <FileText className="w-6 h-6 text-violet/30 mx-auto mb-2" />
        <p className="text-text-muted text-xs font-mono">No daily logs yet...</p>
      </div>
    </Card>
  );
}