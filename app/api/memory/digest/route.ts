import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/mathew/.openclaw/workspace";

interface Digest {
  date: string;
  achieved: string[];
  fellThrough: string[];
  summary: string;
  taskStats: {
    completed: number;
    pending: number;
    total: number;
  };
}

/**
 * Parse ALL tasks from ALL ## Tasks sections in a memory log.
 * A file may have multiple ## Tasks sections if tasks were appended throughout the day.
 */
function parseAllTasks(content: string): { completed: string[]; pending: string[] } {
  const allCompleted: string[] = [];
  const allPending: string[] = [];
  const lines = content.split("\n");
  let inTasks = false;

  for (const line of lines) {
    if (line.match(/^##\s+Tasks/i)) {
      inTasks = true;
      continue;
    }
    if (line.match(/^##\s+/) && inTasks) {
      inTasks = false;
      continue;
    }
    if (inTasks) {
      const doneMatch = line.match(/^-\s+\[x\]\s+(.+)/i);
      const pendingMatch = line.match(/^-\s+\[\s\]\s+(.+)/i);
      if (doneMatch) allCompleted.push(doneMatch[1].trim());
      else if (pendingMatch) allPending.push(pendingMatch[1].trim());
    }
  }

  return { completed: allCompleted, pending: allPending };
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterdayStr = getYesterdayDate();
    const memoryDir = path.join(WORKSPACE, "memory");
    const memoryPath = path.join(WORKSPACE, "MEMORY.md");

    // Prefer today's log, else yesterday's
    const todayPath = path.join(memoryDir, `${today}.md`);
    const yesterdayPath = path.join(memoryDir, `${yesterdayStr}.md`);
    const logPath = fs.existsSync(todayPath) ? todayPath : (fs.existsSync(yesterdayPath) ? yesterdayPath : null);
    const logDate = logPath === todayPath ? today : yesterdayStr;

    let achieved: string[] = [];
    let fellThrough: string[] = [];
    let completed = 0;
    let pending = 0;

    if (logPath) {
      const content = fs.readFileSync(logPath, "utf-8");
      const { completed: doneTasks, pending: pendingTasks } = parseAllTasks(content);
      // Dedupe (same task may appear in multiple ## Tasks sections)
      const uniqueDone = [...new Set(doneTasks)];
      const uniquePending = [...new Set(pendingTasks)];
      completed = uniqueDone.length;
      pending = uniquePending.length;
      achieved = uniqueDone.slice(0, 3);
      fellThrough = uniquePending.slice(0, 2);
    }

    // Generate summary
    let summary = "";
    const targetDate = logPath === todayPath ? "today" : "yesterday";
    if (completed === 0 && pending === 0) {
      summary = `No activity recorded ${targetDate}. Garden was quiet.`;
    } else if (completed >= 3) {
      summary = `Strong day — ${completed} task${completed !== 1 ? "s" : ""} completed. ${pending > 0 ? `${pending} still growing.` : "All clear!"}`;
    } else if (completed > 0) {
      summary = `Incremental progress — ${completed} task${completed !== 1 ? "s" : ""} done. Keep the momentum.`;
    } else if (pending > 0) {
      summary = `No completions ${targetDate}. ${pending} task${pending !== 1 ? "s" : ""} still pending. Time to focus.`;
    }

    // If achieved is empty, pull from MEMORY.md session log
    if (achieved.length === 0 && fs.existsSync(memoryPath)) {
      const memoryContent = fs.readFileSync(memoryPath, "utf-8");
      const sessionMatch = memoryContent.match(/### (\d{4}-\d{2}-\d{2})[\s\S]+?(?=###|$)/);
      if (sessionMatch) {
        achieved = ["Session logged in memory"];
      }
    }

    const digest: Digest = {
      date: logDate,
      achieved: achieved.slice(0, 3),
      fellThrough: fellThrough.slice(0, 2),
      summary,
      taskStats: { completed, pending, total: completed + pending },
    };

    return NextResponse.json(digest);
  } catch (error) {
    console.error("Digest generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate digest", date: getYesterdayDate() },
      { status: 500 }
    );
  }
}
