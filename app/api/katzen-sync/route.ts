import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const MANIFEST_PATH = join(process.cwd(), "src/data/manifest.json");

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const manifest = readFileSync(MANIFEST_PATH, "utf-8");
    const data = JSON.parse(manifest);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "manifest not found", detail: String(err) },
      { status: 404 }
    );
  }
}
