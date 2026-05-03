import fs from "fs";
import path from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/mathew/.openclaw/workspace";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Task {
  content: string;
  status: "pending" | "done";
  assigned?: "K" | "T" | "B";
  completedAt?: string;       // ISO timestamp — only valid timestamps stored
  project?: string;          // Project tag extracted from [P] prefix
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

function isValidTimestamp(val: string): boolean {
  if (!val) return false;
  const ts = new Date(val).getTime();
  return !isNaN(ts) && ts > 0;
}

function parseTimestamp(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Accept only ISO-like patterns: 2026-05-03T08:45:00 or 2026-05-03T08:45:00Z
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) return undefined;
  return isValidTimestamp(raw) ? raw : undefined;
}

export function parseTasksFromMarkdown(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split("\n");

  let inTasksSection = false;

  for (const line of lines) {
    if (line.match(/^##\s+Tasks/i)) {
      inTasksSection = true;
      continue;
    }
    if (line.match(/^##\s+/) && inTasksSection) break;

    if (inTasksSection) {
      // Done task: - [x] [K] [P]ProjectName content (2026-05-03T12:00:00Z)
      // Timestamp is ONLY the last () group that parses as valid ISO
      const doneMatch = line.match(/^-\s+\[x\]\s+(?:\[([KTB])\]\s+)?(?:\[P\]([^\]]+)\]\s+)?(.+?)(?:\s+\(([^)]+)\))?\s*$/i);
      if (doneMatch) {
        const rawContent = doneMatch[3].trim();
        const rawTimestamp = doneMatch[4];

        // Extract project from [P] tag
        const project = doneMatch[2]?.trim();

        // Extract embedded project from content: "[P] ProjectName task"
        const embeddedProject = /^(\[P\]\s*[^\s]+)\s+(.+)/.exec(rawContent);
        const projectFromEmbedded = embeddedProject ? embeddedProject[1].replace("[P]", "").trim() : undefined;
        const finalContent = embeddedProject ? embeddedProject[2].trim() : rawContent;
        const finalProject = project || projectFromEmbedded;

        // Only store timestamp if it's a valid ISO date
        const completedAt = parseTimestamp(rawTimestamp);

        tasks.push({
          status: "done",
          assigned: doneMatch[1]?.toUpperCase() as "K" | "T" | "B" | undefined,
          content: finalContent,
          completedAt,
          project: finalProject,
        });
        continue;
      }

      // Pending task: - [ ] [K] [P]ProjectName content
      const pendingMatch = line.match(/^-\s+\[ \]\s+(?:\[([KTB])\]\s+)?(?:\[P\]([^\]]+)\]\s+)?(.+)/i);
      if (pendingMatch) {
        const rawContent = pendingMatch[3].trim();

        // Extract embedded project from "[P] ProjectName content"
        const embeddedProject = /^(\[P\]\s*[^\s]+)\s+(.+)/.exec(rawContent);
        const project = embeddedProject ? embeddedProject[1].replace("[P]", "").trim() : pendingMatch[2]?.trim();
        const content = embeddedProject ? embeddedProject[2].trim() : rawContent;

        tasks.push({
          status: "pending",
          assigned: pendingMatch[1]?.toUpperCase() as "K" | "T" | "B" | undefined,
          content,
          project: project || undefined,
        });
      }
    }
  }

  return tasks;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getDailyTasks(): Promise<{ tasks: Task[]; dateStr: string }> {
  const dateStr = new Date().toISOString().split("T")[0];
  const dailyLogPath = path.join(WORKSPACE, "memory", `${dateStr}.md`);

  if (!fs.existsSync(dailyLogPath)) return { tasks: [], dateStr };

  const content = fs.readFileSync(dailyLogPath, "utf-8");
  return { tasks: parseTasksFromMarkdown(content), dateStr };
}

export async function addTaskToDailyLog(
  taskContent: string,
  assigned?: "K" | "T" | "B",
  project?: string
): Promise<void> {
  const dateStr = new Date().toISOString().split("T")[0];
  const dailyLogPath = path.join(WORKSPACE, "memory", `${dateStr}.md`);

  if (!fs.existsSync(dailyLogPath)) {
    throw new Error(`Daily log not found: ${dailyLogPath}`);
  }

  const content = fs.readFileSync(dailyLogPath, "utf-8");
  const lines = content.split("\n");

  let tasksSectionIndex = -1;
  let lastTaskIndex = -1;
  let insertAfterIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^##\s+Tasks/i)) { tasksSectionIndex = i; continue; }
    if (line.match(/^##\s+/) && tasksSectionIndex !== -1 && lastTaskIndex === -1) break;
    if (tasksSectionIndex !== -1 && line.match(/^-\s+\[/)) lastTaskIndex = i;
  }

  insertAfterIndex = lastTaskIndex !== -1 ? lastTaskIndex
    : tasksSectionIndex !== -1 ? tasksSectionIndex
    : lines.length - 1;

  const parts: string[] = [];
  if (assigned) parts.push(`[${assigned}]`);
  if (project) parts.push(`[P]${project}]`);
  parts.push(taskContent);
  const newTaskLine = `- [ ] ${parts.join(" ")}`;

  lines.splice(insertAfterIndex + 1, 0, newTaskLine);
  fs.writeFileSync(dailyLogPath, lines.join("\n"), "utf-8");
}

export async function updateTaskInDailyLog(
  oldContent: string,
  newContent?: string,
  newStatus?: "pending" | "done",
  project?: string // new project tag when creating
): Promise<void> {
  const dateStr = new Date().toISOString().split("T")[0];
  const dailyLogPath = path.join(WORKSPACE, "memory", `${dateStr}.md`);

  if (!fs.existsSync(dailyLogPath)) {
    throw new Error(`Daily log not found: ${dailyLogPath}`);
  }

  const content = fs.readFileSync(dailyLogPath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Done task line ─────────────────────────────────────────────────────
    const doneMatch = line.match(/^-\s+\[x\]\s+(?:\[([KTB])\]\s+)?(?:\[P\]([^\]]+)\]\s+)?(.+?)(?:\s+\(([^)]+)\))?\s*$/i);
    if (doneMatch) {
      const existingContent = doneMatch[3].trim();
      const existingProject = doneMatch[2]?.trim();

      if (existingContent === oldContent) {
        let newLine = line;

        if (newStatus === "done") {
          const ts = new Date().toISOString();
          // Replace any existing invalid timestamp
          newLine = line.replace(/\s+\([^)]+\)\s*$/, "") + ` (${ts})`;
        } else if (newStatus === "pending") {
          // Strip timestamp when unchecking
          newLine = line.replace(/^-\s+\[x\]/, "- [ ]").replace(/\s+\([^)]+\)/, "");
        }

        if (newContent !== undefined && newContent !== oldContent) {
          const agentPart = doneMatch[1] ? `[${doneMatch[1]}] ` : "";
          const projPart = existingProject ? `[P]${existingProject}] ` : (project ? `[P]${project}] ` : "");
          const tsMatch = newLine.match(/\(([^)]+)\)$/);
          const tsPart = tsMatch && isValidTimestamp(tsMatch[1]) ? ` (${tsMatch[1]})` : "";
          newLine = newStatus === "done"
            ? `- [x] ${agentPart}${projPart}${newContent}${tsPart}`
            : `- [ ] ${agentPart}${projPart}${newContent}`;
        }

        lines[i] = newLine;
        fs.writeFileSync(dailyLogPath, lines.join("\n"), "utf-8");
        return;
      }
    }

    // ── Pending task line ───────────────────────────────────────────────────
    const pendingMatch = line.match(/^-\s+\[ \]\s+(?:\[([KTB])\]\s+)?(?:\[P\]([^\]]+)\]\s+)?(.+)/i);
    if (pendingMatch) {
      const existingContent = pendingMatch[3].trim();
      const existingProject = pendingMatch[2]?.trim();

      if (existingContent === oldContent) {
        let newLine = line;

        if (newStatus === "done") {
          const ts = new Date().toISOString();
          const agentPart = pendingMatch[1] ? `[${pendingMatch[1]}] ` : "";
          const projPart = existingProject ? `[P]${existingProject}] ` : (project ? `[P]${project}] ` : "");
          newLine = `- [x] ${agentPart}${projPart}${oldContent} (${ts})`;
        } else if (newContent !== undefined) {
          const agentPart = pendingMatch[1] ? `[${pendingMatch[1]}] ` : "";
          const projPart = existingProject ? `[P]${existingProject}] ` : "";
          newLine = `- [ ] ${agentPart}${projPart}${newContent}`;
        }

        lines[i] = newLine;
        fs.writeFileSync(dailyLogPath, lines.join("\n"), "utf-8");
        return;
      }
    }
  }

  throw new Error(`Task not found: ${oldContent}`);
}

export async function getTopPriorityTask(): Promise<Task | null> {
  const { tasks } = await getDailyTasks();
  return tasks.filter((t) => t.status === "pending")[0] ?? null;
}

export async function getMemoryFiles(): Promise<{ date: string; path: string; content: string }[]> {
  const memoryDir = path.join(WORKSPACE, "memory");
  if (!fs.existsSync(memoryDir)) return [];

  return fs.readdirSync(memoryDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse()
    .map((file) => ({
      date: file.replace(".md", ""),
      path: path.join(memoryDir, file),
      content: fs.readFileSync(path.join(memoryDir, file), "utf-8"),
    }));
}

export async function getLongTermMemory(): Promise<{ content: string } | null> {
  const p = path.join(WORKSPACE, "MEMORY.md");
  return fs.existsSync(p) ? { content: fs.readFileSync(p, "utf-8") } : null;
}

export async function getWorkspaceProjects(): Promise<
  { name: string; path: string; isDirectory: boolean; description?: string }[]
> {
  const results: { name: string; path: string; isDirectory: boolean; description?: string }[] = [];

  const memoryDir = path.join(WORKSPACE, "memory");
  if (fs.existsSync(memoryDir)) {
    for (const file of fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md"))) {
      const content = fs.readFileSync(path.join(memoryDir, file), "utf-8");
      for (const m of content.matchAll(/\[PROJECT\]\s*(.+?)(?:\n|$)/gi)) {
        const name = m[1].trim().replace(/^["']|["']$/g, "");
        if (name && !results.find((r) => r.name === name)) {
          results.push({ name, path: "", isDirectory: false, description: `[PROJECT] in ${file}` });
        }
      }
    }
  }

  const projectsDir = path.join(WORKSPACE, "projects");
  if (fs.existsSync(projectsDir)) {
    for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const readmePath = path.join(projectsDir, entry.name, "README.md");
        let description = "Project directory";
        if (fs.existsSync(readmePath)) {
          const readme = fs.readFileSync(readmePath, "utf-8");
          const firstLine = readme.split("\n").find((l) => l.trim() && !l.startsWith("#"));
          if (firstLine) description = firstLine.trim().slice(0, 120);
        }
        results.push({ name: entry.name, path: path.join(projectsDir, entry.name), isDirectory: true, description });
      }
    }
  }

  return results;
}