import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

/** Singleton Postgres pool — reused across route handlers in the same process. */
export function getPool(): Pool {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set in .env.local.");
    }

    if (
      connectionString.includes("@host:") ||
      connectionString.includes("user:password@host")
    ) {
      throw new Error(
        "DATABASE_URL in .env.local contains placeholder credentials ('user:password@host'). Please replace it with your actual Supabase PostgreSQL connection string.",
      );
    }

    if (
      connectionString.includes("[YOUR-PASSWORD]") ||
      connectionString.includes("YOUR-PASSWORD") ||
      connectionString.includes("YOUR_ACTUAL_PASSWORD")
    ) {
      throw new Error(
        "DATABASE_URL in .env.local still contains '[YOUR-PASSWORD]'. Please replace [YOUR-PASSWORD] with your actual Supabase database password (without the square brackets []).",
      );
    }

    // Auto-fix unencoded `@` in password if multiple `@` characters exist in URL
    // e.g. postgresql://postgres:Saksham@123@db.xxx.supabase.co:5432/postgres
    const atMatches = connectionString.match(/@/g);
    if (atMatches && atMatches.length > 1) {
      const lastAt = connectionString.lastIndexOf("@");
      const userPassPart = connectionString.substring(0, lastAt);
      const hostPart = connectionString.substring(lastAt);
      
      const colonIndex = userPassPart.indexOf(":", userPassPart.indexOf("://") + 3);
      if (colonIndex !== -1) {
        const protocolAndUser = userPassPart.substring(0, colonIndex + 1);
        const rawPassword = userPassPart.substring(colonIndex + 1);
        const encodedPassword = encodeURIComponent(rawPassword);
        connectionString = `${protocolAndUser}${encodedPassword}${hostPart}`;
      }
    }

    // Enable SSL for cloud PostgreSQL hosts (Supabase, Railway, Neon, Render)
    const isRemote =
      connectionString.includes("supabase.co") ||
      connectionString.includes("supabase.com") ||
      connectionString.includes("railway") ||
      connectionString.includes("neon.tech") ||
      connectionString.includes("render.com");

    pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 10000,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  try {
    const result = await getPool().query<T>(text, params);
    return result.rows;
  } catch (caught) {
    const err = caught as { code?: string; message?: string } | undefined;
    if (err?.code === "ENOTFOUND" || err?.message?.includes("ENOTFOUND")) {
      throw new Error(
        `Database connection failed (ENOTFOUND). Please verify your DATABASE_URL hostname in .env.local is correct.`,
      );
    }
    if (err?.code === "ETIMEDOUT" || err?.message?.includes("ETIMEDOUT")) {
      throw new Error(
        "Database connection timed out (ETIMEDOUT). If using Supabase, switch to the Supabase Connection Pooler URL in your Supabase Settings -> Database -> Connection String (Pooler, Session or Transaction mode).",
      );
    }
    if (
      err?.code === "28P01" ||
      err?.message?.includes("password authentication failed")
    ) {
      throw new Error(
        "PostgreSQL password authentication failed. Please check that the password in DATABASE_URL inside .env.local matches your Supabase database password.",
      );
    }
    throw err;
  }
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
