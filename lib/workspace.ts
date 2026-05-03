import fs from "fs";
import path from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/mathew/.openclaw/workspace";

export interface Task {
  content: string;
  status: "pending" | "done";
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
    // Look for ## Tasks section
    if (line.match(/^##\s+Tasks/i)) {
      inTasksSection = true;
      continue;
    }

    // Stop at next ## header
    if (line.match(/^##\s+/) && inTasksSection) {
      break;
    }

    if (inTasksSection) {
      // Parse - [ ] or - [x]
      const match = line.match(/^-\s+\[(x| )\]\s+(.+)/i);
      if (match) {
        tasks.push({
          status: match[1].toLowerCase() === "x" ? "done" : "pending",
          content: match[2].trim(),
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
  { name: string; path: string; isDirectory: boolean }[]
> {
  const systemFolders = ["memory", ".openclaw", "node_modules", ".git"];
  const entries = fs.readdirSync(WORKSPACE, { withFileTypes: true });

  return entries
    .filter((entry) => !systemFolders.includes(entry.name))
    .map((entry) => ({
      name: entry.name,
      path: path.join(WORKSPACE, entry.name),
      isDirectory: entry.isDirectory(),
    }));
}