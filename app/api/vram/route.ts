import { NextResponse } from "next/server";
import { execSync } from "child_process";

const WARNING_THRESHOLD = 70;

export async function GET() {
  try {
    const output = execSync(
      "nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits",
      { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }
    );

    const [used, total] = output.trim().split(",").map((s: string) => parseInt(s.trim(), 10));

    if (isNaN(used) || isNaN(total) || total === 0) {
      return NextResponse.json({ used: 0, total: 0, percentage: 0, status: "unavailable" });
    }

    const percentage = Math.round((used / total) * 100);
    const status: "healthy" | "warning" | "unavailable" =
      percentage > WARNING_THRESHOLD ? "warning" : "healthy";

    return NextResponse.json({ used, total, percentage, status });
  } catch {
    return NextResponse.json({ used: 0, total: 0, percentage: 0, status: "unavailable" });
  }
}