import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/mathew/.openclaw/workspace";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects
 * Dynamically scans:
 *   - memory/*.md files for [PROJECT] tags
 *   - workspace/projects/ directories
 * Returns clean JSON array of discovered projects.
 */
export async function GET() {
  const projects: {
    name: string;
    path: string;
    isDirectory: boolean;
    description: string;
    source: "tag" | "directory";
  }[] = [];

  // 1. Scan memory/ for [PROJECT] tags
  const memoryDir = path.join(WORKSPACE, "memory");
  if (fs.existsSync(memoryDir)) {
    const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(memoryDir, file), "utf-8");
      // Match [PROJECT] ProjectName or [PROJECT] "Project Name"
      const tagRegex = /\[PROJECT\]\s*(.+?)(?:\n|$)/gi;
      let match;
      while ((match = tagRegex.exec(content)) !== null) {
        const name = match[1].trim().replace(/^["']|["']$/g, ""); // strip quotes
        if (name && !projects.find((p) => p.name === name)) {
          projects.push({
            name,
            path: "",
            isDirectory: false,
            description: `[PROJECT] tag in ${file}`,
            source: "tag",
          });
        }
      }
    }
  }

  // 2. Scan workspace/projects/ for directories
  const projectsDir = path.join(WORKSPACE, "projects");
  if (fs.existsSync(projectsDir)) {
    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const readmePath = path.join(projectsDir, entry.name, "README.md");
        let description = "Project directory";
        if (fs.existsSync(readmePath)) {
          const readme = fs.readFileSync(readmePath, "utf-8");
          const firstLine = readme.split("\n").find(
            (l) => l.trim() && !l.trim().startsWith("#")
          );
          if (firstLine) description = firstLine.trim().slice(0, 120);
        }
        projects.push({
          name: entry.name,
          path: path.join(projectsDir, entry.name),
          isDirectory: true,
          description,
          source: "directory",
        });
      }
    }
  }

  return NextResponse.json({ projects, count: projects.length });
}