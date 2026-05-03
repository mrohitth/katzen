"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, Cpu, MemoryStick, Clock, Zap, Snowflake, Search, X, FileText, Sparkles } from "lucide-react";

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

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  mission: string;
  status: "active" | "in_stasis" | "initializing";
  enabled: boolean;
  tools: string[];
}

interface SearchResult {
  file: string;
  date: string;
  matches: { line: number; content: string; snippet: string }[];
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
  const [deepWorkMode, setDeepWorkMode] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [agentSheetOpen, setAgentSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchTaskCount = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      const done = data.doneCount || 0;
      setCompletedTasks(done);
      const bloomCount = Math.min(Math.floor(done / 3), 6);
      setFlowers(Array.from({ length: bloomCount }));

      // Check if there's an in-progress task (deep work mode)
      // For now, simulate with random chance or if >3 done tasks
      setDeepWorkMode(done >= 3 && Math.random() > 0.5);
    } catch {
      setCompletedTasks(0);
      setFlowers([]);
    }
  }, []);

  useEffect(() => {
    fetchTaskCount();
    const interval = setInterval(fetchTaskCount, 10000);
    return () => clearInterval(interval);
  }, [fetchTaskCount]);

  const handleAgentClick = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents?id=${agentId}`);
      const data = await res.json();
      setSelectedAgent(data);
      setAgentSheetOpen(true);
    } catch (error) {
      console.error("Failed to fetch agent info:", error);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="p-8 min-h-screen relative overflow-hidden pb-24">
      {/* Mist Overlay Background */}
      <div className="absolute inset-0 mist-overlay pointer-events-none" />

      {/* Header */}
      <div className="mb-8 relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-text-primary">Zen Office</h1>
            <Badge variant="outline" className="border-violet text-violet font-mono text-xs">
              BIO-DIGITAL
            </Badge>
            {deepWorkMode && (
              <Badge variant="outline" className="border-moss text-moss font-mono text-xs animate-pulse">
                DEEP WORK
              </Badge>
            )}
          </div>
          <p className="text-text-secondary text-sm">
            Agent activity visualization — organic, living, calm
          </p>
        </div>

        {/* Search Button */}
        <Button
          variant="outline"
          onClick={() => setSearchOpen(true)}
          className="border-border text-text-secondary hover:border-moss hover:text-moss gap-2"
        >
          <Search className="w-4 h-4" />
          <span className="text-xs">Ctrl+K</span>
        </Button>
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

            {/* 8-bit pixel art style avatar - intensified in deep work */}
            <div
              className={`w-28 h-28 rounded-xl bg-gradient-to-br from-moss/30 to-violet/30 flex items-center justify-center relative mb-6 transition-all duration-500 ${
                deepWorkMode ? "scale-110" : ""
              }`}
              style={{
                boxShadow: deepWorkMode
                  ? "0 0 50px rgba(74, 222, 128, 0.6), 0 0 100px rgba(74, 222, 128, 0.3)"
                  : "0 0 30px rgba(74, 222, 128, 0.3)",
              }}
            >
              <span className={`text-6xl transition-transform ${deepWorkMode ? "animate-pulse" : ""}`}>
                🧠
              </span>
              {agents.filter((a) => a.status === "active").length > 0 && (
                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-moss border-2 border-obsidian-light ${
                    deepWorkMode ? "animate-ping" : "animate-pulse"
                  }`}
                />
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
              <button
                onClick={() => agent.id !== "kitty" && handleAgentClick(agent.id)}
                className={`w-full text-left ${
                  agent.id !== "kitty" ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                }`}
                disabled={agent.id === "kitty"}
              >
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
              </button>

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

      {/* Agent Detail Sheet */}
      <Sheet open={agentSheetOpen} onOpenChange={setAgentSheetOpen}>
        <SheetContent className="bg-obsidian-light border-border text-text-primary">
          <SheetHeader>
            <SheetTitle className="text-text-primary">
              {selectedAgent?.name || "Agent"} Details
            </SheetTitle>
          </SheetHeader>
          {selectedAgent && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Role</p>
                <p className="text-text-primary">{selectedAgent.role}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Mission</p>
                <p className="text-text-secondary text-sm">{selectedAgent.mission}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Status</p>
                <Badge
                  variant="secondary"
                  className={`font-mono text-xs ${
                    selectedAgent.status === "active"
                      ? "bg-moss/10 text-moss border-moss/20"
                      : "bg-amber/10 text-amber border-amber/20"
                  }`}
                >
                  {selectedAgent.status.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Enabled Tools</p>
                <div className="flex flex-wrap gap-1">
                  {selectedAgent.tools.map((tool) => (
                    <Badge
                      key={tool}
                      variant="secondary"
                      className="bg-obsidian border-border text-text-muted font-mono text-xs"
                    >
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Search Modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="bg-obsidian-light border-border text-text-primary max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-text-primary flex items-center gap-2">
              <Search className="w-5 h-5 text-moss" />
              Memory Search
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search memory files... (min 2 chars)"
                className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 pl-12 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-moss font-mono text-sm"
                autoFocus
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Button
              onClick={handleSearch}
              disabled={searchQuery.length < 2 || searching}
              className="w-full bg-moss/10 text-moss border border-moss/20 hover:bg-moss/20"
            >
              {searching ? "Searching..." : "Search"}
            </Button>

            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                <p className="text-text-muted text-xs font-mono">
                  {searchResults.reduce((sum, r) => sum + r.matches.length, 0)} matches found
                </p>
                {searchResults.map((result) => (
                  <div key={result.file} className="p-3 rounded-lg bg-obsidian border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-violet" />
                      <span className="text-text-primary text-sm font-medium">
                        {result.file}
                      </span>
                      <span className="text-text-muted text-xs font-mono">
                        {result.date}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {result.matches.map((match, i) => (
                        <p key={i} className="text-text-secondary text-xs font-mono">
                          <span className="text-violet">{match.line}:</span>{" "}
                          <span dangerouslySetInnerHTML={{ __html: match.snippet.replace(new RegExp(`(${searchQuery})`, 'gi'), '<mark class="bg-moss/20 text-moss">$1</mark>') }} />
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
              <p className="text-text-muted text-sm text-center">
                No results found for "{searchQuery}"
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}