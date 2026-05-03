import fs from "fs";
import path from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/mathew/.openclaw/workspace";

export interface Task {
  content: string;
  status: "pending" | "done";
  assigned?: "K" | "T" | "B"; // Kitty, Titty, Bitty
  completedAt?: string; // ISO timestamp when marked done
}

export async function getDailyTasks(): Promise<{ tasks: Task[]; dateStr: string }> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
  const dailyLogPath = path.join(WORKSPACE, "memory", `${dateStr}.md`);

  let tasks: Task[] = [];

  if (fs.existsSync(dailyLogPath)) {
    const content = fs.readFileSync(dailyLogPath, "utf-8");
    tasks = parseTasksFromMarkdown(content);
  }

  return { tasks, dateStr };
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

    if (line.match(/^##\s+/) && inTasksSection) {
      break;
    }

    if (inTasksSection) {
      // Match done tasks: - [x] [K] content (2026-05-03T12:00:00)
      const doneMatch = line.match(/^-\s+\[x\]\s+(?:\[([KTB])\]\s+)?(.+?)(?:\s+\(([^)]+)\))?\s*$/i);
      if (doneMatch) {
        tasks.push({
          status: "done",
          assigned: doneMatch[1]?.toUpperCase() as "K" | "T" | "B" | undefined,
          content: doneMatch[2].trim(),
          completedAt: doneMatch[3] || undefined,
        });
        continue;
      }
      // Match pending tasks: - [ ] [K] content
      const pendingMatch = line.match(/^-\s+\[ \]\s+(?:\[([KTB])\]\s+)?(.+)/i);
      if (pendingMatch) {
        tasks.push({
          status: "pending",
          assigned: pendingMatch[1]?.toUpperCase() as "K" | "T" | "B" | undefined,
          content: pendingMatch[2].trim(),
        });
      }
    }
  }

  return tasks;
}

export async function getMemoryFiles(): Promise<{ date: string; path: string; content: string }[]> {
  const memoryDir = path.join(WORKSPACE, "memory");

  if (!fs.existsSync(memoryDir)) {
    return [];
  }

  const files = fs
    .readdirSync(memoryDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse(); // Most recent first

  return files.map((file) => {
    const filePath = path.join(memoryDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const date = file.replace(".md", "");
    return { date, path: filePath, content };
  });
}

export async function getLongTermMemory(): Promise<{ content: string } | null> {
  const memoryPath = path.join(WORKSPACE, "MEMORY.md");

  if (!fs.existsSync(memoryPath)) {
    return null;
  }

  return { content: fs.readFileSync(memoryPath, "utf-8") };
}

export async function getWorkspaceProjects(): Promise<
  { name: string; path: string; isDirectory: boolean; description?: string }[]
> {
  // Scan memory/ for [PROJECT] tags
  const projects: { name: string; path: string; isDirectory: boolean; description?: string }[] = [];
  const memoryDir = path.join(WORKSPACE, "memory");
  if (fs.existsSync(memoryDir)) {
    const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(memoryDir, file), "utf-8");
      const projectMatches = content.matchAll(/\[PROJECT\]\s*(.+?)(?:\n|$)/gi);
      for (const match of projectMatches) {
        const name = match[1].trim();
        if (name && !projects.find((p) => p.name === name)) {
          projects.push({ name, path: "", isDirectory: false, description: `[PROJECT] tag in ${file}` });
        }
      }
    }
  }

  // Scan workspace/projects/ for directories
  const projectsDir = path.join(WORKSPACE, "projects");
  if (fs.existsSync(projectsDir)) {
    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const readmePath = path.join(projectsDir, entry.name, "README.md");
        let description = "Project directory";
        if (fs.existsSync(readmePath)) {
          const readme = fs.readFileSync(readmePath, "utf-8");
          const firstLine = readme.split("\n").find((l) => l.trim() && !l.trim().startsWith("#"));
          if (firstLine) description = firstLine.trim().slice(0, 80);
        }
        projects.push({ name: entry.name, path: path.join(projectsDir, entry.name), isDirectory: true, description });
      }
    }
  }

  return projects;
}

export async function addTaskToDailyLog(
  taskContent: string,
  assigned?: "K" | "T" | "B"
): Promise<void> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
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
    if (line.match(/^##\s+Tasks/i)) {
      tasksSectionIndex = i;
      continue;
    }
    if (line.match(/^##\s+/) && tasksSectionIndex !== -1 && lastTaskIndex === -1) {
      break;
    }
    if (tasksSectionIndex !== -1) {
      if (line.match(/^-\s+\[/)) {
        lastTaskIndex = i;
      }
    }
  }

  if (lastTaskIndex !== -1) {
    insertAfterIndex = lastTaskIndex;
  } else if (tasksSectionIndex !== -1) {
    insertAfterIndex = tasksSectionIndex;
  } else {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^##\s+/)) {
        insertAfterIndex = i - 1;
        break;
      }
    }
    if (insertAfterIndex === -1) {
      insertAfterIndex = lines.length - 1;
    }
  }

  const agentPrefix = assigned ? `[${assigned}] ` : "";
  const newTaskLine = `- [ ] ${agentPrefix}${taskContent}`;

  lines.splice(insertAfterIndex + 1, 0, newTaskLine);
  fs.writeFileSync(dailyLogPath, lines.join("\n"), "utf-8");
}

export async function updateTaskInDailyLog(
  oldContent: string,
  newContent?: string,
  newStatus?: "pending" | "done"
): Promise<void> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const dailyLogPath = path.join(WORKSPACE, "memory", `${dateStr}.md`);

  if (!fs.existsSync(dailyLogPath)) {
    throw new Error(`Daily log not found: ${dailyLogPath}`);
  }

  const content = fs.readFileSync(dailyLogPath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match done task: - [x] [K] content (2026-05-03T12:00:00)
    const doneMatch = line.match(/^-\s+\[x\]\s+(?:\[([KTB])\]\s+)?(.+?)(?:\s+\(([^)]+)\))?\s*$/i);
    if (doneMatch) {
      if (doneMatch[2].trim() === oldContent) {
        let newLine = line;
        if (newStatus === "done") {
          // Add/update timestamp
          const ts = new Date().toISOString();
          newLine = line.replace(/\s+\([^)]+\)\s*$/, "") + ` (${ts})`;
        } else if (newStatus === "pending") {
          // Remove checkbox x and timestamp
          newLine = line.replace(/^-\s+\[x\]/, "- [ ]").replace(/\s+\([^)]+\)/, "");
        }
        if (newContent !== undefined && newContent !== oldContent) {
          const agentPart = doneMatch[1] ? `[${doneMatch[1]}] ` : "";
          const tsPart = doneMatch[3] ? ` (${doneMatch[3]})` : "";
          newLine = newStatus === "done"
            ? `- [x] ${agentPart}${newContent}${tsPart}`
            : `- [ ] ${agentPart}${newContent}`;
        }
        lines[i] = newLine;
        fs.writeFileSync(dailyLogPath, lines.join("\n"), "utf-8");
        return;
      }
    }

    // Match pending task: - [ ] [K] content
    const pendingMatch = line.match(/^-\s+\[ \]\s+(?:\[([KTB])\]\s+)?(.+)/i);
    if (pendingMatch) {
      if (pendingMatch[2].trim() === oldContent) {
        let newLine = line;
        if (newStatus === "done") {
          const agentPart = pendingMatch[1] ? `[${pendingMatch[1]}] ` : "";
          const ts = new Date().toISOString();
          newLine = `- [x] ${agentPart}${oldContent} (${ts})`;
        } else if (newContent !== undefined) {
          const agentPart = pendingMatch[1] ? `[${pendingMatch[1]}] ` : "";
          newLine = `- [ ] ${agentPart}${newContent}`;
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
  const pending = tasks.filter((t) => t.status === "pending");
  return pending.length > 0 ? pending[0] : null;
}