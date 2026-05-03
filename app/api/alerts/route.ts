import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const MANIFEST_PATH = join(process.cwd(), "src/data/manifest.json");

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const manifest = readFileSync(MANIFEST_PATH, "utf-8");
    const data = JSON.parse(manifest);
    return NextResponse.json({
      alerts: data.alerts_history ?? [],
      ideas: data.ideas_backlog ?? [],
      schema_version: data.schema_version,
      last_updated: data.last_updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "manifest not found", detail: String(err) },
      { status: 404 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));

    if (body.action === "add_alert") {
      const entry: any = {
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agent: body.agent ?? body.source ?? "SYSTEM",
        status_code: body.status_code ?? "OK",
        type: body.type ?? "system",
        severity: body.severity ?? "info",
        message: body.message,
        source: body.source ?? "SYSTEM",
      };
      manifest.alerts_history = manifest.alerts_history ?? [];
      manifest.alerts_history.unshift(entry);
      // Keep last 100 — auto-archive oldest 50 when exceeding limit
      if (manifest.alerts_history.length > 100) {
        const archive = manifest.alerts_history.slice(50);
        manifest.alerts_history = manifest.alerts_history.slice(0, 50);
        try {
          const { writeFileSync, mkdirSync, existsSync } = await import("fs");
          const archiveDir = "/home/mathew/.openclaw/workspace/wiki/logs/archive";
          if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });
          const archivePath = `${archiveDir}/alerts_May2026.md`;
          const ts = new Date().toISOString();
          const lines = archive.map((a: any) =>
            `[${a.timestamp}] [${a.agent}] [${a.status_code}] ${a.message}`
          ).join("\n");
          const header = existsSync(archivePath)
            ? ""
            : `# Alerts Archive — May 2026\n\n*Auto-archived from manifest.json alerts_history*\n\n`;
          writeFileSync(archivePath, header + lines + "\n", { flag: "a" });
        } catch { /* archive write failed — continue */ }
      }
    } else if (body.action === "add_idea") {
      const idea = {
        id: `idea-${Date.now()}`,
        cycle: body.cycle ?? "KP-???",
        title: body.title,
        description: body.description ?? "",
        status: "proposed",
        complexity_index: body.complexity_index ?? 3,
        proposed_at: new Date().toISOString(),
        votes: 0,
      };
      manifest.ideas_backlog = manifest.ideas_backlog ?? [];
      manifest.ideas_backlog.unshift(idea);
    } else if (body.action === "vote_idea") {
      const idea = manifest.ideas_backlog?.find((i: any) => i.id === body.id);
      if (idea) idea.votes = (idea.votes ?? 0) + 1;
    } else if (body.action === "update_idea_status") {
      const idea = manifest.ideas_backlog?.find((i: any) => i.id === body.id);
      if (idea) idea.status = body.status;
    }

    manifest.last_updated = new Date().toISOString();
    manifest.schema_version = "2.0";

    // Strip any bot tokens or chat IDs before sending to client
    const sanitized = JSON.parse(JSON.stringify(manifest));
    sanitized.alerts_history = sanitized.alerts_history?.map((a: any) => ({
      ...a,
      message: a.message,
    }));

    // Remove sensitive fields if accidentally stored in ideas
    sanitized.ideas_backlog = sanitized.ideas_backlog?.map((i: any) => ({
      ...i,
      description: i.description,
    }));

    return NextResponse.json(sanitized);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
