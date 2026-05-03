import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// vram_monitor is the internal throttle coordinator.
// The VRAMPulse component polls /api/vram every 30s client-side.
// State tracking for throttle decisions lives in /home/mathew/.cache/vram_monitor_state.json
// accessible via file I/O on the server.

export async function GET() {
  try {
    const { readFileSync, existsSync } = await import("fs");
    const statePath = "/home/mathew/.cache/vram_monitor_state.json";
    if (existsSync(statePath)) {
      const state = JSON.parse(readFileSync(statePath, "utf-8"));
      return NextResponse.json(state);
    }
    return NextResponse.json({
      poll_interval: 30,
      throttle_count: 0,
      healthy_count: 0,
      warning_count: 0,
      last_status: "unknown",
      note: "No state file yet — monitor has not run.",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}