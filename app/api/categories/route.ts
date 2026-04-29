import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT DISTINCT level1 FROM businesses
      WHERE level1 IS NOT NULL
      ORDER BY level1
    `;
    return NextResponse.json(rows.map((r) => r.level1));
  } catch (e) {
    console.error("[categories]", e);
    return NextResponse.json([], { status: 500 });
  }
}
