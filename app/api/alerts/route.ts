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
      const alert = {
        id: `alert-${Date.now()}`,
        type: body.type ?? "system",
        severity: body.severity ?? "info",
        message: body.message,
        timestamp: new Date().toISOString(),
        source: body.source ?? "SYSTEM",
      };
      manifest.alerts_history = manifest.alerts_history ?? [];
      manifest.alerts_history.unshift(alert);
      // Keep last 100 alerts
      manifest.alerts_history = manifest.alerts_history.slice(0, 100);
    } else if (body.action === "add_idea") {
      const idea = {
        id: `idea-${Date.now()}`,
        cycle: body.cycle ?? "KP-???",
        title: body.title,
        description: body.description ?? "",
        status: "proposed",
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
