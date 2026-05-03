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

export async function addTaskToDailyLog(taskContent: string): Promise<void> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const dailyLogPath = path.join(WORKSPACE, "memory", `${dateStr}.md`);

  if (!fs.existsSync(dailyLogPath)) {
    throw new Error(`Daily log not found: ${dailyLogPath}`);
  }

  const content = fs.readFileSync(dailyLogPath, "utf-8");
  const lines = content.split("\n");

  // Find the last task line in the ## Tasks section
  let tasksSectionIndex = -1;
  let lastTaskIndex = -1;
  let insertAfterIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^##\s+Tasks/i)) {
      tasksSectionIndex = i;
      continue;
    }
    // Stop at next ## header
    if (line.match(/^##\s+/) && tasksSectionIndex !== -1 && lastTaskIndex === -1) {
      break;
    }
    if (tasksSectionIndex !== -1) {
      // Found a task line
      if (line.match(/^-\s+\[/)) {
        lastTaskIndex = i;
      }
    }
  }

  if (lastTaskIndex !== -1) {
    // Insert after the last task
    insertAfterIndex = lastTaskIndex;
  } else if (tasksSectionIndex !== -1) {
    // No tasks found but section exists - insert after the header
    insertAfterIndex = tasksSectionIndex;
  } else {
    // No Tasks section - this shouldn't happen but handle it
    // Insert before the first ## if any, or at end
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

  // Build the new task line
  const newTaskLine = `- [ ] ${taskContent}`;

  // Insert the new task
  lines.splice(insertAfterIndex + 1, 0, newTaskLine);

  // Write back
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

  // Find and replace the specific task line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^-\s+\[([x\s])\]\s+(.+)/i);
    if (match) {
      const taskContent = match[2].trim();
      if (taskContent === oldContent) {
        // Build replacement line
        let newLine = line;
        if (newStatus !== undefined) {
          const checkbox = newStatus === "done" ? "x" : " ";
          newLine = line.replace(/^-\s+\[([x\s])\]/, `- [${checkbox}]`);
        }
        if (newContent !== undefined && newContent !== oldContent) {
          newLine = newLine.replace(/^-\s+\[([x\s])\]\s+.+/, `- [${newStatus === "done" ? "x" : match[1] === "x" ? "x" : " "}] ${newContent}`);
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