import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const query    = p.get("q")?.trim()        ?? "";
  const city     = p.get("city")?.trim()     ?? "";
  const category = p.get("category")?.trim() ?? "";
  const minYears = p.get("min_years") != null ? Number(p.get("min_years")) : null;
  const maxYears = p.get("max_years") != null ? Number(p.get("max_years")) : null;

  try {
    const results = await sql`
      SELECT fsq_place_id, name, address, locality, region,
             zip_clean, level1, level2, latitude, longitude,
             overall_score, verdict,
             CASE WHEN date_created ~ E'^\\d{4}-\\d{2}-\\d{2}'
                  THEN round((date_part('day', now() - date_created::timestamp) / 365.25)::numeric, 1)
                  ELSE NULL END AS age_years
      FROM businesses
      WHERE TRUE
      ${query    ? sql`AND (name ILIKE ${"%" + query + "%"} OR locality ILIKE ${"%" + query + "%"} OR level2 ILIKE ${"%" + query + "%"})` : sql``}
      ${city     ? sql`AND locality ILIKE ${"%" + city + "%"}` : sql``}
      ${category ? sql`AND level1 = ${category}` : sql``}
      ${minYears != null ? sql`AND date_created ~ E'^\\d{4}-\\d{2}-\\d{2}' AND (date_part('day', now() - date_created::timestamp) / 365.25)::numeric >= ${minYears}` : sql``}
      ${maxYears != null ? sql`AND date_created ~ E'^\\d{4}-\\d{2}-\\d{2}' AND (date_part('day', now() - date_created::timestamp) / 365.25)::numeric <= ${maxYears}` : sql``}
      ORDER BY overall_score DESC NULLS LAST
      LIMIT 25
    `;
    return NextResponse.json(results);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.error("[search]", msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
