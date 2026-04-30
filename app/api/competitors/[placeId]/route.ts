import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { placeId: string } }) {
  const { placeId } = params;

  try {
    const target = await sql`
      SELECT zip_clean, level2 FROM businesses WHERE fsq_place_id = ${placeId} LIMIT 1
    `;

    if (!target.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { zip_clean, level2 } = target[0];

    const results = await sql`
      SELECT fsq_place_id, name, address, latitude, longitude,
             date_created, level3, overall_score, verdict,
             saturation_score, churn_score, diversity_score
      FROM businesses
      WHERE fsq_place_id != ${placeId}
        AND level2 = ${level2}
        AND zip_clean = ${zip_clean}
      LIMIT 20
    `;

    return NextResponse.json(results);
  } catch (e: any) {
    console.error("[competitors]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
