import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Re-fetch every 60 seconds

export async function GET() {
  try {
    const owner = "mrohitth";
    const repo = "katzen";

    // Fetch repo data
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "KATZEN-Dashboard",
      },
      next: { revalidate: 60 },
    });

    if (!repoRes.ok) {
      throw new Error(`GitHub API error: ${repoRes.status}`);
    }

    const repoData = await repoRes.json();

    // Fetch commits
    const commitsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "KATZEN-Dashboard",
        },
        next: { revalidate: 60 },
      }
    );

    const commitsData = await commitsRes.json();

    const commits = Array.isArray(commitsData)
      ? commitsData.slice(0, 5).map((c: any) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0].slice(0, 72),
          date: c.commit.author.date,
          author: c.author?.login || c.commit.author.name,
        }))
      : [];

    return NextResponse.json({
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      openIssues: repoData.open_issues_count || 0,
      watchers: repoData.watchers_count || 0,
      defaultBranch: repoData.default_branch || "main",
      lastPush: repoData.pushed_at,
      commits,
    });
  } catch (error) {
    console.error("Failed to fetch GitHub stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch GitHub stats", stats: null },
      { status: 500 }
    );
  }
}