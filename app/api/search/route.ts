import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/mathew/.openclaw/workspace";

interface SearchResult {
  file: string;
  date: string;
  matches: { line: number; content: string; snippet: string }[];
}

function searchInFile(filePath: string, query: string): SearchResult["matches"] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const queryLower = query.toLowerCase();
  const matches: SearchResult["matches"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes(queryLower)) {
      // Get context: 50 chars before and after
      const start = Math.max(0, line.indexOf(queryLower) - 30);
      const snippet = line.slice(start, start + 100);
      matches.push({
        line: i + 1,
        content: line.trim().slice(0, 200),
        snippet: "..." + snippet + "...",
      });
    }
  }

  return matches;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query");

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], query: query || "" });
    }

    const results: SearchResult[] = [];
    const memoryDir = path.join(WORKSPACE, "memory");

    // Search MEMORY.md
    const memoryPath = path.join(WORKSPACE, "MEMORY.md");
    const memoryMatches = searchInFile(memoryPath, query);
    if (memoryMatches.length > 0) {
      results.push({
        file: "MEMORY.md",
        date: "Long-term",
        matches: memoryMatches.slice(0, 10), // Limit results per file
      });
    }

    // Search daily logs
    if (fs.existsSync(memoryDir)) {
      const files = fs
        .readdirSync(memoryDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse();

      for (const file of files) {
        const filePath = path.join(memoryDir, file);
        const matches = searchInFile(filePath, query);
        if (matches.length > 0) {
          results.push({
            file,
            date: file.replace(".md", ""),
            matches: matches.slice(0, 5),
          });
        }
        // Stop after finding results in a few files
        if (results.length > 5) break;
      }
    }

    return NextResponse.json({
      results,
      query,
      totalMatches: results.reduce((sum, r) => sum + r.matches.length, 0),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { results: [], error: "Search failed" },
      { status: 500 }
    );
  }
}