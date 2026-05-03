import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const MANIFEST_PATH = join(process.cwd(), "src/data/manifest.json");

const VALID_IDEA_FIELDS = new Set([
  "id", "cycle", "title", "description", "status",
  "proposed_at", "votes", "complexity_index"
]);
const VALID_ALERT_FIELDS = new Set([
  "id", "timestamp", "agent", "status_code", "type", "severity",
  "message", "source", "model", "grouped", "count"
]);

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
        timestamp: new Date().toISOString(),
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

      if (manifest.alerts_history.length > 100) {
        const archive = manifest.alerts_history.slice(50);
        manifest.alerts_history = manifest.alerts_history.slice(0, 50);
        try {
          const { writeFileSync, mkdirSync, existsSync } = await import("fs");
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
        proposed_at: new Date().toISOString(),
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

    manifest.last_updated = new Date().toISOString();

    readFileSync(MANIFEST_PATH, "utf-8");
    const { writeFileSync } = await import("fs");
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    const grouped = groupAlerts(manifest.alerts_history ?? []);

    return NextResponse.json({
      alerts: grouped,
      ideas: manifest.ideas_backlog,
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
 * Group repetitive entries: consecutive same [agent]+[status_code] ≥ 5 → summary card
 */
function groupAlerts(alerts: any[]): any[] {
  const result: any[] = [];
  let i = 0;

  while (i < alerts.length) {
    const current = alerts[i];
    const combo = `${current.agent}|${current.status_code}`;
    let count = 1;

    let j = i + 1;
    while (j < alerts.length && `${alerts[j].agent}|${alerts[j].status_code}` === combo) {
      count++;
      j++;
    }

    if (count >= 5) {
      result.push({
        id: `group-${combo}-${count}`,
        timestamp: current.timestamp,
        agent: current.agent,
        status_code: current.status_code,
        type: current.type ?? "system",
        severity: current.severity ?? "info",
        message: `${count} ${current.agent} ${current.status_code} events — last 24h`,
        source: current.source ?? current.agent,
        model: current.model ?? getModelForAgent(current.agent),
        grouped: true,
        count,
      });
    } else {
      for (let k = i; k < j; k++) result.push({ ...alerts[k], grouped: false });
    }

    i = j;
  }

  return result;
}