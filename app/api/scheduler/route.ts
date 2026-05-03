import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 30;

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/mathew/.openclaw/workspace";

interface CronJob {
  name: string;
  schedule: string;
  nextRun: string | null;
  status: string;
}

function parseCronExpression(expr: string): { interval: number; nextRunMs: number } | null {
  // Simple cron: every X minutes/hours/days
  // Format: "*/5 * * * *" = every 5 minutes
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const [minute, hour, day, month, dow] = parts;

  // Handle */X patterns
  if (minute.startsWith("*/")) {
    const interval = parseInt(minute.slice(2)) * 60 * 1000; // minutes to ms
    return { interval, nextRunMs: interval };
  }
  if (hour.startsWith("*/")) {
    const interval = parseInt(hour.slice(2)) * 60 * 60 * 1000; // hours to ms
    return { interval, nextRunMs: interval };
  }

  return null;
}

export async function GET() {
  try {
    const configPath = path.join(WORKSPACE, "..", "openclaw.json");
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ jobs: [], nextRun: null });
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    // Get cron jobs from the flows directory (TaskFlow jobs)
    const flowsDir = path.join(WORKSPACE, "..", "flows");
    let cronJobs: CronJob[] = [];

    if (fs.existsSync(flowsDir)) {
      // Check registry for scheduled jobs
      const registryPath = path.join(flowsDir, "registry.sqlite");
      // For now, use mock data since we don't have actual cron entries yet
      // In production, query the registry
    }

    // Check openclaw.json for any cron configuration
    if (config.cron && Array.isArray(config.cron)) {
      cronJobs = config.cron.map((job: any) => ({
        name: job.name || "Unnamed Job",
        schedule: job.schedule?.expr || "*/30 * * * *",
        nextRun: null,
        status: job.enabled === false ? "disabled" : "active",
      }));
    } else {
      // Default heartbeat job if nothing configured
      cronJobs = [
        {
          name: "Heartbeat",
          schedule: "*/30 * * * *",
          nextRun: null,
          status: "active",
        },
      ];
    }

    // Calculate next run times
    const now = Date.now();
    const jobsWithNextRun = cronJobs.map((job) => {
      if (job.status === "disabled") {
        return { ...job, nextRun: null };
      }
      const parsed = parseCronExpression(job.schedule);
      if (parsed) {
        const nextRunMs = now + parsed.nextRunMs;
        return { ...job, nextRun: new Date(nextRunMs).toISOString() };
      }
      // Default: run in 30 minutes
      return {
        ...job,
        nextRun: new Date(now + 30 * 60 * 1000).toISOString(),
      };
    });

    // Find the soonest job
    const activeJobs = jobsWithNextRun.filter((j) => j.nextRun && j.status === "active");
    const nextRunJob = activeJobs.reduce((soonest, job) => {
      if (!soonest.nextRun) return job;
      if (!job.nextRun) return soonest;
      return new Date(job.nextRun) < new Date(soonest.nextRun) ? job : soonest;
    }, {} as CronJob);

    return NextResponse.json({
      jobs: jobsWithNextRun,
      nextRun: nextRunJob?.nextRun || null,
      nextRunName: nextRunJob?.name || null,
    });
  } catch (error) {
    console.error("Scheduler fetch error:", error);
    return NextResponse.json(
      { jobs: [], nextRun: null, error: "Failed to fetch scheduler" },
      { status: 500 }
    );
  }
}