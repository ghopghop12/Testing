import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { apiKeysTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface AuthRequest extends Request {
  apiKey?: typeof apiKeysTable.$inferSelect;
}

/**
 * Atomically check and increment the daily quota.
 * Returns the post-update row, or null if quota is exceeded or no key found.
 * Handles day rollover in a single atomic UPDATE ... RETURNING.
 */
async function atomicQuotaIncrement(
  keyId: string,
): Promise<typeof apiKeysTable.$inferSelect | null> {
  const now = new Date();
  // midnight UTC start of today
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  // Single atomic UPDATE: reset counter if last_reset_at is before today, else
  // increment only if below limit. RETURNING gives us post-update values.
  const rows = await db.execute(sql`
    UPDATE api_keys
    SET
      requests_today = CASE
        WHEN last_reset_at < ${todayUtc.toISOString()} THEN 1
        WHEN requests_today < daily_limit THEN requests_today + 1
        ELSE requests_today
      END,
      last_reset_at = CASE
        WHEN last_reset_at < ${todayUtc.toISOString()} THEN now()
        ELSE last_reset_at
      END
    WHERE api_key = ${keyId}
    RETURNING *
  `);

  const row = (rows as { rows: Record<string, unknown>[] }).rows[0];
  if (!row) return null;

  // Map snake_case DB columns to the Drizzle type shape
  return {
    id: row["id"] as string,
    keyId: row["key_id"] as string,
    apiKey: row["api_key"] as string,
    email: row["email"] as string,
    name: (row["name"] as string | null) ?? null,
    plan: row["plan"] as "free" | "pro" | "unlimited",
    requestsToday: row["requests_today"] as number,
    dailyLimit: row["daily_limit"] as number,
    lastResetAt: new Date(row["last_reset_at"] as string),
    createdAt: new Date(row["created_at"] as string),
  };
}

export function requireApiKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "unauthorized",
      message:
        "Missing or invalid Authorization header. Use: Authorization: Bearer <api_key>",
    });
    return;
  }

  const token = authHeader.slice(7);

  atomicQuotaIncrement(token)
    .then((key) => {
      if (!key) {
        res.status(401).json({
          error: "unauthorized",
          message: "Invalid API key",
        });
        return;
      }

      // Check if quota was hit (counter didn't move up OR reset would have set it to 1)
      const quotaExceeded =
        key.requestsToday >= key.dailyLimit &&
        key.requestsToday !== 1; // 1 means we just reset — it's fine

      if (quotaExceeded) {
        const now = new Date();
        const resetAt = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
        );
        res.status(429).json({
          error: "rate_limit_exceeded",
          message: `Daily quota of ${key.dailyLimit} requests exceeded. Resets at ${resetAt.toISOString()}.`,
        });
        return;
      }

      req.apiKey = key; // post-increment, accurate
      next();
    })
    .catch((err) => next(err));
}
