import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const WORKSPACE = "/home/mathew/.openclaw/workspace";

// Re-export the exact same parseTasksFromMarkdown used by the app
// This file is server-only — never imported by client components
export function parseTasksFromMarkdown(content: string) {
  const tasks: any[] = [];
  const lines = content.split("\n");
  let inTasksSection = false;

  for (const line of lines) {
    if (line.match(/^##\s+Tasks/i)) { inTasksSection = true; continue; }
    if (line.match(/^##\s+/) && inTasksSection) break;

    if (inTasksSection) {
      const doneMatch = line.match(/^-\s+\[x\]\s+(?:\[([KTB])\]\s+)?(?:\[P\]([^\]]+)\]\s+)?(.+?)(?:\s+\(([^)]+)\))?\s*$/i);
      if (doneMatch) {
        const rawContent = doneMatch[3].trim();
        const embeddedProject = /^(\[P\]\s*[^\s]+)\s+(.+)/.exec(rawContent);
        const project = doneMatch[2]?.trim() || (embeddedProject ? embeddedProject[1].replace("[P]", "").trim() : undefined);
        const finalContent = embeddedProject ? embeddedProject[2].trim() : rawContent;
        const rawTimestamp = doneMatch[4];
        const completedAt = rawTimestamp && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(rawTimestamp) ? rawTimestamp : undefined;

        tasks.push({ status: "done", content: finalContent, project, completedAt, assigned: doneMatch[1]?.toUpperCase() });
        continue;
      }

      const pendingMatch = line.match(/^-\s+\[ \]\s+(?:\[([KTB])\]\s+)?(?:\[P\]([^\]]+)\]\s+)?(.+)/i);
      if (pendingMatch) {
        const rawContent = pendingMatch[3].trim();
        const embeddedProject = /^(\[P\]\s*[^\s]+)\s+(.+)/.exec(rawContent);
        const project = pendingMatch[2]?.trim() || (embeddedProject ? embeddedProject[1].replace("[P]", "").trim() : undefined);
        const content = embeddedProject ? embeddedProject[2].trim() : rawContent;
        tasks.push({ status: "pending", content, project, assigned: pendingMatch[1]?.toUpperCase() });
      }
    }
  }
  return tasks;
}

export async function getDailyTasks() {
  const dateStr = new Date().toISOString().split("T")[0];
  const logPath = path.join(WORKSPACE, "memory", `${dateStr}.md`);
  if (!fs.existsSync(logPath)) return { tasks: [], dateStr };
  const content = fs.readFileSync(logPath, "utf-8");
  return { tasks: parseTasksFromMarkdown(content), dateStr };
}

export async function getMemoryFiles() {
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

export async function getLongTermMemory() {
  const p = path.join(WORKSPACE, "MEMORY.md");
  return fs.existsSync(p) ? { content: fs.readFileSync(p, "utf-8") } : null;
}

export async function getWorkspaceProjects() {
  const results: any[] = [];
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
  return results;
}

export async function addTaskToDailyLog(taskContent: string, assigned?: string, project?: string) {
  const dateStr = new Date().toISOString().split("T")[0];
  const logPath = path.join(WORKSPACE, "memory", `${dateStr}.md`);
  if (!fs.existsSync(logPath)) throw new Error(`Daily log not found: ${logPath}`);

  const content = fs.readFileSync(logPath, "utf-8");
  const lines = content.split("\n");
  let tasksSectionIndex = -1, lastTaskIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.match(/^##\s+Tasks/i)) { tasksSectionIndex = i; continue; }
    if (l.match(/^##\s+/) && tasksSectionIndex !== -1 && lastTaskIndex === -1) break;
    if (tasksSectionIndex !== -1 && l.match(/^-\s+\[/)) lastTaskIndex = i;
  }

  const insertAfter = lastTaskIndex !== -1 ? lastTaskIndex : tasksSectionIndex !== -1 ? tasksSectionIndex : lines.length - 1;
  const parts: string[] = [];
  if (assigned) parts.push(`[${assigned}]`);
  if (project) parts.push(`[P]${project}]`);
  parts.push(taskContent);
  lines.splice(insertAfter + 1, 0, `- [ ] ${parts.join(" ")}`);
  fs.writeFileSync(logPath, lines.join("\n"), "utf-8");
}

export async function updateTaskInDailyLog(oldContent: string, newContent?: string, newStatus?: string, project?: string) {
  const dateStr = new Date().toISOString().split("T")[0];
  const logPath = path.join(WORKSPACE, "memory", `${dateStr}.md`);
  if (!fs.existsSync(logPath)) throw new Error(`Daily log not found: ${logPath}`);

  const content = fs.readFileSync(logPath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const doneMatch = line.match(/^-\s+\[x\]\s+(?:\[([KTB])\]\s+)?(?:\[P\]([^\]]+)\]\s+)?(.+?)(?:\s+\(([^)]+)\))?\s*$/i);
    if (doneMatch && doneMatch[3].trim() === oldContent) {
      const agentPart = doneMatch[1] ? `[${doneMatch[1]}] ` : "";
      const existingProject = doneMatch[2]?.trim();
      const projPart = existingProject ? `[P]${existingProject}] ` : (project ? `[P]${project}] ` : "");

      let newLine = line;
      if (newStatus === "done") {
        const ts = new Date().toISOString();
        newLine = line.replace(/\s+\([^)]+\)\s*$/, "") + ` (${ts})`;
      } else if (newStatus === "pending") {
        newLine = line.replace(/^-\s+\[x\]/, "- [ ]").replace(/\s+\([^)]+\)/, "");
      }
      if (newContent !== undefined && newContent !== oldContent) {
        const tsMatch = newLine.match(/\(([^)]+)\)$/);
        const tsPart = tsMatch ? ` (${tsMatch[1]})` : "";
        newLine = newStatus === "done"
          ? `- [x] ${agentPart}${projPart}${newContent}${tsPart}`
          : `- [ ] ${agentPart}${projPart}${newContent}`;
      }
      lines[i] = newLine;
      fs.writeFileSync(logPath, lines.join("\n"), "utf-8");
      return;
    }

    const pendingMatch = line.match(/^-\s+\[ \]\s+(?:\[([KTB])\]\s+)?(?:\[P\]([^\]]+)\]\s+)?(.+)/i);
    if (pendingMatch && pendingMatch[3].trim() === oldContent) {
      const agentPart = pendingMatch[1] ? `[${pendingMatch[1]}] ` : "";
      const existingProject = pendingMatch[2]?.trim();
      const projPart = existingProject ? `[P]${existingProject}] ` : (project ? `[P]${project}] ` : "");

      if (newStatus === "done") {
        const ts = new Date().toISOString();
        lines[i] = `- [x] ${agentPart}${projPart}${oldContent} (${ts})`;
      } else if (newContent !== undefined) {
        lines[i] = `- [ ] ${agentPart}${projPart}${newContent}`;
      } else {
        lines[i] = line;
      }
      fs.writeFileSync(logPath, lines.join("\n"), "utf-8");
      return;
    }
  }
  throw new Error(`Task not found: ${oldContent}`);
}

export async function getTopPriorityTask() {
  const { tasks } = await getDailyTasks();
  return tasks.filter((t) => t.status === "pending")[0] ?? null;
}