import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/mathew/.openclaw/workspace";

interface TaskSummary {
  date: string;
  completed: { content: string; agent?: string }[];
  pending: { content: string; agent?: string }[];
  total: number;
  agentContributions: Record<string, number>;
}

function parseTasksFromContent(content: string): { 
  completed: { content: string; agent?: string }[]; 
  pending: { content: string; agent?: string }[];
} {
  const lines = content.split("\n");
  const completed: { content: string; agent?: string }[] = [];
  const pending: { content: string; agent?: string }[] = [];
  let inTasks = false;

  for (const line of lines) {
    if (line.match(/^##\s+Tasks/i)) {
      inTasks = true;
      continue;
    }
    if (line.match(/^##\s+/) && inTasks) break;
    if (inTasks) {
      // Parse with optional [K], [T], [B] agent prefix
      const doneMatch = line.match(/^-\s+\[x\]\s+(?:\[([KTB])\]\s+)?(.+)/i);
      const pendingMatch = line.match(/^-\s+\[\s]\s+(?:\[([KTB])\]\s+)?(.+)/i);
      if (doneMatch) {
        completed.push({
          content: doneMatch[2].trim(),
          agent: doneMatch[1]?.toUpperCase()
        });
      } else if (pendingMatch) {
        pending.push({
          content: pendingMatch[2].trim(),
          agent: pendingMatch[1]?.toUpperCase()
        });
      }
    }
  }

  return { completed, pending };
}

function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  // Include today (index 0) and the previous n-1 days
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function tallyAgentContributions(taskSummaries: TaskSummary[]): Record<string, number> {
  const contributions: Record<string, number> = {
    "K": 0, // Kitty
    "T": 0, // Titty
    "B": 0, // Bitty
  };
  
  const agentNames: Record<string, string> = {
    "K": "Kitty",
    "T": "Titty",
    "B": "Bitty",
  };

  for (const day of taskSummaries) {
    for (const task of day.completed) {
      const agent = task.agent || "K";
      if (contributions[agent] !== undefined) {
        contributions[agent]++;
      }
    }
  }

  return contributions;
}

function generateWeeklyReport(taskSummaries: TaskSummary[], agentContributions: Record<string, number>): string {
  const totalTasks = taskSummaries.reduce((sum, t) => sum + t.total, 0);
  const totalCompleted = taskSummaries.reduce((sum, t) => sum + t.completed.length, 0);
  const totalPending = taskSummaries.reduce((sum, t) => sum + t.pending.length, 0);

  const allCompleted = taskSummaries.flatMap((t) => t.completed);
  const allPending = taskSummaries.flatMap((t) => t.pending);
  
  // Dedupe completed tasks
  const uniqueCompleted = [...new Set(allCompleted.map((t) => t.content))];
  const uniquePending = [...new Set(allPending.map((t) => t.content))];

  const agentNames: Record<string, string> = {
    "K": "Kitty",
    "T": "Titty",
    "B": "Bitty",
  };

  let report = `# Weekly Agent Report\n\n`;
  report += `Generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n\n`;

  report += `## Summary\n\n`;
  report += `- **Total Tasks Tracked:** ${totalTasks}\n`;
  report += `- **Completed:** ${totalCompleted} (${totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}%)\n`;
  report += `- **Pending:** ${totalPending}\n\n`;

  report += `## Contributions by Agent\n\n`;
  report += `| Agent | Completed |\n`;
  report += `|-------|-----------|\n`;
  for (const [agent, count] of Object.entries(agentContributions)) {
    const name = agentNames[agent] || agent;
    report += `| ${name} [${agent}] | ${count} |\n`;
  }
  report += `\n`;

  report += `## Focus Areas This Week\n\n`;
  if (uniqueCompleted.length > 0) {
    report += `### Completed\n\n`;
    uniqueCompleted.forEach((task) => {
      report += `- ~~${task}~~ ✓\n`;
    });
    report += `\n`;
  }

  if (uniquePending.length > 0) {
    report += `### Still In Progress\n\n`;
    uniquePending.forEach((task) => {
      report += `- ${task}\n`;
    });
    report += `\n`;
  }

  report += `## Daily Breakdown\n\n`;
  taskSummaries.forEach((day) => {
    report += `### ${day.date}\n\n`;
    if (day.completed.length > 0) {
      report += `**Done:** ${day.completed.length}\n`;
      day.completed.forEach((t) => {
        const prefix = t.agent ? `[${t.agent}] ` : '';
        report += `- ~~${prefix}${t.content}~~\n`;
      });
    }
    if (day.pending.length > 0) {
      report += `**Pending:** ${day.pending.length}\n`;
      day.pending.forEach((t) => {
        const prefix = t.agent ? `[${t.agent}] ` : '';
        report += `- ${prefix}${t.content}\n`;
      });
    }
    if (day.completed.length === 0 && day.pending.length === 0) {
      report += `No tasks recorded.\n`;
    }
    report += `\n`;
  });

  report += `---\n\n*Generated by KATZEN Agent Dashboard*\n`;

  return report;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("raw") === "1";

    const days = 7;
    const dates = getLastNDays(days);
    const memoryDir = path.join(WORKSPACE, "memory");
    const docsDir = path.join(WORKSPACE, "docs");

    // Ensure docs directory exists
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const taskSummaries: TaskSummary[] = [];
    const recentTasks: { content: string; agent?: string }[] = [];
    const recentPending: { content: string; agent?: string }[] = [];

    for (const date of dates) {
      const filePath = path.join(memoryDir, `${date}.md`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const { completed, pending } = parseTasksFromContent(content);
        taskSummaries.push({
          date,
          completed,
          pending,
          total: completed.length + pending.length,
          agentContributions: {},
        });
        
        // Track recent unique tasks
        completed.forEach((t) => {
          if (!recentTasks.some((rt) => rt.content === t.content)) recentTasks.push(t);
        });
        pending.forEach((t) => {
          if (!recentPending.some((rp) => rp.content === t.content)) recentPending.push(t);
        });
      }
    }

    // Tally agent contributions
    const agentContributions = tallyAgentContributions(taskSummaries);

    // Generate report with agent attribution
    const report = generateWeeklyReport(taskSummaries, agentContributions);

    // Write to docs
    const today = new Date().toISOString().split("T")[0];
    const filename = `weekly-report-${today}.md`;
    const filePath = path.join(docsDir, filename);
    fs.writeFileSync(filePath, report, "utf-8");

    if (raw) {
      return new NextResponse(report, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return NextResponse.json({
      success: true,
      filename,
      path: filePath,
      summary: {
        daysCovered: taskSummaries.length,
        totalTasks: taskSummaries.reduce((s, t) => s + t.total, 0),
        completedCount: recentTasks.length,
        pendingCount: recentPending.length,
        agentContributions,
      },
      toastMessage: `[KITTY]: New documentation indexed: ${filename}`,
    });
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: "Failed to generate weekly report" },
      { status: 500 }
    );
  }
}