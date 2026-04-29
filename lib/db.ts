import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var _sql: ReturnType<typeof postgres> | undefined;
}

// Reuse the connection across hot-reloads in development so we don't exhaust
// the Supabase pooler's connection limit. In production each serverless
// function instance gets its own module scope (max:1 = one connection each).
const sql =
  globalThis._sql ??
  postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalThis._sql = sql;

export default sql;
