import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT DISTINCT level1 FROM businesses
      WHERE level1 IS NOT NULL
        AND level1 NOT IN ('Arts and Entertainment','Community and Government','Event','Landmarks and Outdoors','Travel and Transportation')
      ORDER BY level1
    `;
    return NextResponse.json(rows.map((r: any) => r.level1));
  } catch (e: any) {
    console.error("[categories]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
