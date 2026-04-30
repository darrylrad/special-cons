import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var _sql: ReturnType<typeof postgres> | undefined;
}

console.log("[db] cold start —", new Date().toISOString());

const sql =
  globalThis._sql ??
  postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    max: 1,
    connect_timeout: 30,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalThis._sql = sql;

export default sql;
