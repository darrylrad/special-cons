import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

const s = (v: any, d = "") => (v == null ? d : String(v));
const f = (v: any, d = 0, digits = 1) => (v == null ? d : +parseFloat(v).toFixed(digits));
const i = (v: any, d = 0) => (v == null ? d : parseInt(v, 10));

export async function GET(_req: NextRequest, { params }: { params: { placeId: string } }) {
  const { placeId } = params;

  try {
    const rows = await sql`SELECT * FROM businesses WHERE fsq_place_id = ${placeId} LIMIT 1`;

    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const b = rows[0];

    return NextResponse.json({
      business: {
        name:      s(b.name),
        address:   s(b.address),
        locality:  s(b.locality),
        region:    s(b.region),
        postcode:  s(b.zip_clean),
        latitude:  f(b.latitude, 0, 6),
        longitude: f(b.longitude, 0, 6),
        category:  s(b.level2) || s(b.level1),
        level1:    s(b.level1),
        level2:    s(b.level2),
        level3:    s(b.level3),
      },
      verdict:       s(b.verdict),
      overall_score: f(b.overall_score, 0, 1),
      scores: {
        saturation: f(b.saturation_score, 0, 1),
        churn:      f(b.churn_score, 0, 1),
        diversity:  f(b.diversity_score, 0, 1),
      },
      details: {
        competitors_in_zip:       i(b.same_category_count_zip),
        historical_closure_rate:  f(b.historical_closure_rate, 0, 3),
        avg_competitor_age_years: f(b.avg_same_category_age_zip, 0, 1),
        ecosystem_diversity:      i(b.level2_diversity),
        population:               b.population != null ? i(b.population) : null,
        businesses_per_10k:       b.businesses_per_10k_people != null ? f(b.businesses_per_10k_people, 0, 2) : null,
      },
    });
  } catch (e: any) {
    console.error("[report]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
