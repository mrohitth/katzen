import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Track heartbeats via a simple counter
    // In production, you'd store this in a persistent store
    // For now, we return the current count based on uptime
    const uptimeMs = process.uptime() * 1000;
    const heartbeatIntervalMs = 30 * 60 * 1000; // 30 minutes
    const heartbeatCount = Math.floor(uptimeMs / heartbeatIntervalMs);

    // Initialize phase: 0-3 heartbeats = initializing, 3-6 = active
    const incubatorProgress = Math.min(100, (heartbeatCount % 10) * 10);

    return NextResponse.json({
      heartbeatCount,
      intervalMs: heartbeatIntervalMs,
      nextHeartbeatIn: heartbeatIntervalMs - (uptimeMs % heartbeatIntervalMs),
      incubatorProgress,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json(
      { error: "Failed to get heartbeat status" },
      { status: 500 }
    );
  }
}