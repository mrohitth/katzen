import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/mathew/.openclaw/workspace";

export const dynamic = "force-dynamic";

interface Project {
  name: string;
  path: string;
  isDirectory: boolean;
  description: string;
  source: "tag" | "directory" | "wiki";
  owner?: string;
  status?: string;
}

/**
 * GET /api/projects
 * Scans three sources:
 *   1. memory/*.md files for [PROJECT] tags
 *   2. workspace/projects/ directories
 *   3. wiki/ directory for .md project files (NEW)
 */
export async function GET() {
  const projects: Project[] = [];

  // ── 1. Scan memory/ for [PROJECT] tags ─────────────────────────────────
  const memoryDir = path.join(WORKSPACE, "memory");
  if (fs.existsSync(memoryDir)) {
    const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(memoryDir, file), "utf-8");
      const tagRegex = /\[PROJECT\]\s*(.+?)(?:\n|$)/gi;
      let match;
      while ((match = tagRegex.exec(content)) !== null) {
        const name = match[1].trim().replace(/^["']|["']$/g, "");
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

  // ── 2. Scan workspace/projects/ for directories ─────────────────────────
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

  // ── 3. Scan wiki/ for .md project files (top-level + projects/) ──────────
  const wikiDir = path.join(WORKSPACE, "wiki");
  const wikiProjectsDir = path.join(wikiDir, "projects");

  // Collect wiki project files from both wiki/ root and wiki/projects/
  const wikiPaths = [wikiDir, wikiProjectsDir].filter(p => fs.existsSync(p));

  for (const wp of wikiPaths) {
    const files = fs.readdirSync(wp).filter((f) => f.endsWith(".md") && f !== "index.md");
    for (const file of files) {
      const filePath = path.join(wp, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      // Extract title (# Project Name)
      const titleLine = lines.find((l) => l.startsWith("# "));
      const name = titleLine ? titleLine.slice(2).trim() : file.replace(".md", "");

      // Extract Owner [K]/[T]/[W]/[M]/[B]
      const ownerMatch = content.match(/\*\*Owner:\*\*\s*\[([KWTMB])\]/i);
      const owner = ownerMatch ? ownerMatch[1].toUpperCase() : null;

      // Extract Status
      const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/i);
      const status = statusMatch ? statusMatch[1].trim() : "Unknown";

      // Build description from first non-header, non-empty line
      const descLine = lines.find(
        (l) => l.trim() && !l.trim().startsWith("#") && !l.trim().startsWith("**")
      );
      const description = descLine ? descLine.trim().slice(0, 120) : "Wiki project entry";

      // Avoid duplicates
      if (!projects.find((p) => p.name === name)) {
        projects.push({
          name,
          path: filePath,
          isDirectory: false,
          description,
          source: "wiki",
          owner: owner || undefined,
          status,
        });
      }
    }
  }

  return NextResponse.json({ projects, count: projects.length });
}