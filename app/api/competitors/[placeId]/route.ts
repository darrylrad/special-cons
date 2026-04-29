import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

const RADIUS_M  = 1000;
const LAT_DELTA = (RADIUS_M / 111_111) * 1.2;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;

  try {
    const anchor = await sql`
      SELECT latitude, longitude, level2
      FROM businesses
      WHERE fsq_place_id = ${placeId}
      LIMIT 1
    `;
    if (anchor.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { latitude, longitude, level2 } = anchor[0];
    if (latitude == null || longitude == null) return NextResponse.json([]);

    const lat = Number(latitude);
    const lng = Number(longitude);
    const lngDelta = LAT_DELTA / Math.cos((lat * Math.PI) / 180);

    const results = await sql`
      SELECT fsq_place_id, name, address, latitude, longitude,
             date_created, level3, overall_score, verdict,
             saturation_score, churn_score, diversity_score
      FROM businesses
      WHERE fsq_place_id != ${placeId}
        AND level2 = ${level2}
        AND latitude  BETWEEN ${lat - LAT_DELTA} AND ${lat + LAT_DELTA}
        AND longitude BETWEEN ${lng - lngDelta}  AND ${lng + lngDelta}
        AND ST_DWithin(
              ST_MakePoint(longitude::float, latitude::float)::geography,
              ST_MakePoint(${lng}, ${lat})::geography,
              ${RADIUS_M}
            )
      ORDER BY ST_Distance(
              ST_MakePoint(longitude::float, latitude::float)::geography,
              ST_MakePoint(${lng}, ${lat})::geography
             ) ASC
      LIMIT 20
    `;

    return NextResponse.json(results);
  } catch (e) {
    console.error("[competitors]", e);
    return NextResponse.json({ error: "Competitors failed" }, { status: 500 });
  }
}
