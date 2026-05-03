import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 5; // Poll every 5 seconds

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/mathew/.openclaw/workspace";

export async function GET() {
  try {
    // Check if docs directory exists
    const docsDir = path.join(WORKSPACE, "docs");
    let files: { name: string; path: string; created: string }[] = [];

    if (fs.existsSync(docsDir)) {
      const entries = fs.readdirSync(docsDir, { withFileTypes: true });
      files = entries
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => {
          const filePath = path.join(docsDir, e.name);
          const stats = fs.statSync(filePath);
          return {
            name: e.name,
            path: filePath,
            created: stats.birthtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    }

    return NextResponse.json({
      files,
      count: files.length,
      docsPath: docsDir,
    });
  } catch (error) {
    console.error("Docs index error:", error);
    return NextResponse.json({ files: [], count: 0, error: "Failed to index docs" });
  }
}