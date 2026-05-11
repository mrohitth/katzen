/**
 * vram_service.ts — VRAM Watchdog 2.0
 *
 * Telemetry: memory.used/total, temperature.gpu, utilization.gpu, compute-apps
 * Output: "used_MB, total_MB, temp_C, utilization_%" (e.g. "3412, 4096, 72, 38")
 *
 * Process name from: nvidia-smi --query-compute-apps=pid,process_name,used_memory
 *
 * Returns null if GPU is unavailable.
 */

export interface VRAMInfo {
  used: number;           // MB
  total: number;          // MB
  percentage: number;      // 0-100
  status: "healthy" | "warning" | "sleep" | "unavailable";
  temperature?: number;   // °C
  utilization?: number;   // 0-100 %
  computeApps?: { name: string; pid: number; memory: number }[];
  isIdle: boolean;        // true when percentage < 1
}

const WARNING_THRESHOLD  = 70;   // % VRAM → warning
const TEMP_THRESHOLD    = 80;   // °C    → thermal warning
const IDLE_THRESHOLD    = 1;    // %     → sleep/idle
const PEAK_THRESHOLD    = 10;   // %     → usage peak alert trigger

export { WARNING_THRESHOLD, TEMP_THRESHOLD, IDLE_THRESHOLD, PEAK_THRESHOLD };

export async function getVRAM(): Promise<VRAMInfo | null> {
  try {
    const { execSync } = await import("child_process");

    // Primary telemetry: VRAM + temp + utilization
    const primary = execSync(
      "nvidia-smi --query-gpu=memory.used,memory.total,temperature.gpu,utilization.gpu " +
      "--format=csv,noheader,nounits",
      { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }
    );

    const primaryTrimmed = primary.trim();
    const primaryParts = primaryTrimmed.split(",").map((s: string) => parseInt(s.trim(), 10));

    if (primaryParts.length < 4 || isNaN(primaryParts[0]) || isNaN(primaryParts[1]) || primaryParts[1] === 0) {
      return null;
    }

    const [used, total, temperature, utilization] = primaryParts;
    const percentage = Math.round((used / total) * 100);
    const isIdle = percentage < IDLE_THRESHOLD;

    let status: VRAMInfo["status"] = "healthy";
    if (percentage > WARNING_THRESHOLD)  status = "warning";
    if (isIdle)                          status = "sleep";

    // Compute apps — attached process name + memory
    let computeApps: VRAMInfo["computeApps"] = [];
    try {
      const appsRaw = execSync(
        "nvidia-smi --query-compute-apps=pid,process_name,used_memory " +
        "--format=csv,noheader,nounits",
        { encoding: "utf-8", timeout: 3000, stdio: ["pipe", "pipe", "pipe"] }
      );

      const lines = appsRaw.trim().split("\n").filter(Boolean);
      computeApps = lines.map((line: string) => {
        const [pidStr, name, memStr] = line.split(",").map((s: string) => s.trim());
        return {
          pid:     parseInt(pidStr, 10)  || 0,
          name:    name                  || "unknown",
          memory:  parseInt(memStr, 10)  || 0,  // KB
        };
      });
    } catch {
      computeApps = [];
    }

    return {
      used,
      total,
      percentage,
      status,
      temperature,
      utilization,
      computeApps,
      isIdle,
    };
  } catch {
    return null;
  }
}
