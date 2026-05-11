import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const MANIFEST_PATH = join(process.cwd(), "src/data/manifest.json");
const MAX_ALERTS = 50;   // B log: accumulate up to 50 alerts before archiving

// EDT helpers (America/New_York)
function tsEdt(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,  // 24-hour
  }).replace(/,/g, "") + " EDT";
}
function nowEdt(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  }).replace(/,/g, "") + " EDT";
}

const VALID_IDEA_FIELDS = new Set([
  "id", "cycle", "title", "description", "status",
  "proposed_at", "votes", "complexity_index"
]);
const VALID_ALERT_FIELDS = new Set([
  "id", "timestamp", "agent", "status_code", "type", "severity",
  "message", "source", "model", "grouped", "count"
]);

const VALID_BUILD_TASK_FIELDS = new Set(["agent", "name", "status"]); // status: pending|active|done|skipped
const VALID_BUILD_FIELDS = new Set(["build_id", "name", "status", "status_pct", "tasks", "trend", "frustration_score", "commercial_intent", "started_at"]);

const ALERT_MODEL_MAP: Record<string, string> = {
  MITTY: "gemini/gemini-2.5-flash",
  KITTY: "deepseek/deepseek-chat-v3",
  WITTY: "deepseek/deepseek-chat-v3-flash",
  BITTY: "llama3.2:3b (local)",
  TATTY: "minimax/MiniMax-M2.7",
  GATEWAY: "default",
  SYSTEM: "scheduler",
};

function getModelForAgent(agent: string): string {
  return ALERT_MODEL_MAP[agent.toUpperCase()] ?? "unknown";
}

function checkSchemaViolations(data: any): string[] {
  const violations: string[] = [];
  if (data.ideas_backlog) {
    for (const idea of data.ideas_backlog) {
      for (const key of Object.keys(idea)) {
        if (!VALID_IDEA_FIELDS.has(key)) {
          violations.push(`SCHEMA_VIOLATION: idea field '${key}' not in schema`);
        }
      }
    }
  }
  if (data.alerts_history) {
    for (const alert of data.alerts_history) {
      for (const key of Object.keys(alert)) {
        if (!VALID_ALERT_FIELDS.has(key)) {
          violations.push(`SCHEMA_VIOLATION: alert field '${key}' not in schema`);
        }
      }
    }
  }
  return violations;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = readFileSync(MANIFEST_PATH, "utf-8");
    const data = JSON.parse(raw);
    const groupedAlerts = groupAlerts(data.alerts_history ?? []);
    const violations = checkSchemaViolations(data);

    return NextResponse.json({
      alerts: groupedAlerts,
      ideas: data.ideas_backlog ?? [],
      build: data.build ?? null,
      schema_version: data.schema_version,
      last_updated: data.last_updated,
      system_capabilities: data.system_capabilities ?? {},
      schema_violations: violations.length > 0 ? violations : undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: "manifest not found", detail: String(err) }, { status: 404 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const raw = readFileSync(MANIFEST_PATH, "utf-8");
    const manifest = JSON.parse(raw);

    const violations = checkSchemaViolations(manifest);

    if (body.action === "add_alert") {
      const agent = body.agent ?? body.source ?? "SYSTEM";
      const entry: Record<string, unknown> = {
        id: `alert-${Date.now()}`,
        timestamp: tsEdt(),
        agent,
        status_code: body.status_code ?? "OK",
        type: body.type ?? "system",
        severity: body.severity ?? "info",
        message: body.message,
        source: body.source ?? body.agent ?? "SYSTEM",
        model: getModelForAgent(agent),
      };

      for (const key of Object.keys(entry)) {
        if (!VALID_ALERT_FIELDS.has(key)) {
          return NextResponse.json(
            { error: "SCHEMA_VIOLATION", field: key, message: `Field '${key}' not permitted in alerts_history` },
            { status: 400 }
          );
        }
      }

      manifest.alerts_history = manifest.alerts_history ?? [];
      manifest.alerts_history.unshift(entry as typeof manifest.alerts_history[number]);

      // B log: archive only when over MAX_ALERTS, keep newest MAX_ALERTS
      if (manifest.alerts_history.length > MAX_ALERTS) {
        const archive = manifest.alerts_history.slice(MAX_ALERTS);
        manifest.alerts_history = manifest.alerts_history.slice(0, MAX_ALERTS);
        try {
          const archiveDir = "/home/mathew/.openclaw/workspace/wiki/logs/archive";
          if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });
          const archivePath = `${archiveDir}/alerts_May2026.md`;
          const header = existsSync(archivePath) ? "" : "# Alerts Archive — May 2026\n\n";
          const lines = archive.map((a: any) =>
            `[${a.timestamp}] [${a.agent}] [${a.status_code}] [Model: ${a.model ?? "unknown"}] ${a.message}`
          ).join("\n");
          writeFileSync(archivePath, header + lines + "\n", { flag: "a" });
        } catch { /* archive write failed — continue */ }
      }
    } else if (body.action === "add_idea") {
      const idea: Record<string, unknown> = {
        id: `idea-${Date.now()}`,
        cycle: body.cycle ?? "KP-???",
        title: body.title,
        description: body.description ?? "",
        status: "proposed",
        complexity_index: body.complexity_index ?? 3,
        proposed_at: tsEdt(),
        votes: 0,
      };

      for (const key of Object.keys(idea)) {
        if (!VALID_IDEA_FIELDS.has(key)) {
          return NextResponse.json(
            { error: "SCHEMA_VIOLATION", field: key, message: `Field '${key}' not permitted in ideas_backlog` },
            { status: 400 }
          );
        }
      }

      manifest.ideas_backlog = manifest.ideas_backlog ?? [];
      manifest.ideas_backlog.unshift(idea as typeof manifest.ideas_backlog[number]);
    } else if (body.action === "vote_idea") {
      const idea = manifest.ideas_backlog?.find((i: any) => i.id === body.id);
      if (idea) idea.votes = (idea.votes ?? 0) + 1;
    } else if (body.action === "start_build") {
      const build = {
        build_id: `build-${Date.now()}`,
        name: body.name ?? "Unnamed Build",
        trend: body.trend ?? "",
        frustration_score: body.frustration_score ?? 0,
        commercial_intent: body.commercial_intent ?? 0,
        status: "drafting",
        status_pct: 20,
        started_at: tsEdt(),
        tasks: [
          { agent: "BITTY", name: "Naming Pass", status: "done" },
          { agent: "WITTY", name: "Market Brief", status: "done" },
          { agent: "TATTY", name: "Content Generation", status: "active" },
          { agent: "BITTY", name: "Scrub Pass", status: "pending" },
          { agent: "KITTY", name: "Final Polish", status: "pending" },
        ],
      };
      manifest.build = build;

    } else if (body.action === "update_build_task") {
      if (!manifest.build) {
        return NextResponse.json({ error: "NO_ACTIVE_BUILD" }, { status: 400 });
      }
      const task = manifest.build.tasks?.find((t: any) => t.name === body.task_name);
      if (task) {
        task.status = body.status; // pending|active|done|skipped
        // Recalc pct
        const done = manifest.build.tasks.filter((t: any) => t.status === "done" || t.status === "skipped").length;
        manifest.build.status_pct = Math.round((done / manifest.build.tasks.length) * 100);
        if (body.status === "done") manifest.build.status = "polishing";
        if (done === manifest.build.tasks.length) { manifest.build.status = "complete"; manifest.build.status_pct = 100; }
      }

    } else if (body.action === "end_build") {
      delete manifest.build;

    } else if (body.action === "update_idea_status") {
      const VALID_STATUSES = new Set(["proposed", "approved", "rejected", "implemented"]);
      const idea = manifest.ideas_backlog?.find((i: any) => i.id === body.id);
      if (!idea) {
        return NextResponse.json({ error: "NOT_FOUND", message: `Idea '${body.id}' not found` }, { status: 404 });
      }
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json(
          { error: "SCHEMA_VIOLATION", field: "status", message: `Invalid status '${body.status}' — must be one of: proposed, approved, rejected, implemented` },
          { status: 400 }
        );
      }
      idea.status = body.status;
    }

    manifest.last_updated = tsEdt();

    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    const grouped = groupAlerts(manifest.alerts_history ?? []);

    return NextResponse.json({
      alerts: grouped,
      ideas: manifest.ideas_backlog,
      build: manifest.build ?? null,
      schema_version: manifest.schema_version,
      last_updated: manifest.last_updated,
      system_capabilities: manifest.system_capabilities ?? {},
      schema_violations: violations.length > 0 ? violations : undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * Smart Alert Aggregation — roll up consecutive same [agent]+[status_code] pairs.
 * count >= 2 → single card with count=N badge.
 * Shows most-recent timestamp of the rolled-up batch.
 */
function groupAlerts(alerts: any[]): any[] {
  const result: any[] = [];
  let i = 0;

  while (i < alerts.length) {
    const current = alerts[i];
    const combo = `${current.agent}|${current.status_code}`;
    let count = 1;
    let lastTs = current.timestamp;

    let j = i + 1;
    while (j < alerts.length && `${alerts[j].agent}|${alerts[j].status_code}` === combo) {
      count++;
      lastTs = alerts[j].timestamp;   // keep newest timestamp
      j++;
    }

    if (count >= 2) {
      // Aggregation card — roll up all count occurrences into one
      result.push({
        id: `rollup-${combo}-${count}`,
        timestamp: lastTs,           // most recent
        agent: current.agent,
        status_code: current.status_code,
        type: current.type ?? "system",
        severity: current.severity ?? "info",
        message: current.message,
        source: current.source ?? current.agent,
        model: current.model ?? getModelForAgent(current.agent),
        grouped: true,
        count,                       // → ×N badge in frontend
      });
    } else {
      result.push({ ...current, grouped: false });
    }

    i = j;
  }

  return result;
}