import { NextResponse } from "next/server";
import { getVRAM } from "@/lib/vram_service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const vram = await getVRAM();

  if (vram === null) {
    return NextResponse.json({
      used: 0,
      total: 0,
      percentage: 0,
      status: "unavailable",
    });
  }

  return NextResponse.json(vram);
}