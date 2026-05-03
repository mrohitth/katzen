/**
 * vram_service.ts — VRAM monitoring via nvidia-smi
 *
 * Calls: nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits
 * Output: "used_MB, total_MB" (e.g. "3412, 4096")
 *
 * Returns null if GPU is unavailable or the command fails.
 */

export interface VRAMInfo {
  used: number;       // MB
  total: number;       // MB
  percentage: number; // 0-100
  status: "healthy" | "warning" | "unavailable";
}

const WARNING_THRESHOLD = 70;

export async function getVRAM(): Promise<VRAMInfo | null> {
  try {
    const { execSync } = await import("child_process");

    const output = execSync(
      "nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits",
      {
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    const trimmed = output.trim();
    const parts = trimmed.split(",").map((s: string) => parseInt(s.trim(), 10));

    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1]) || parts[1] === 0) {
      return null;
    }

    const [used, total] = parts;
    const percentage = Math.round((used / total) * 100);

    let status: "healthy" | "warning" | "unavailable" = "healthy";
    if (percentage > WARNING_THRESHOLD) {
      status = "warning";
    }

    return { used, total, percentage, status };
  } catch {
    // GPU unavailable or nvidia-smi not present — return null, caller handles gracefully
    return null;
  }
}