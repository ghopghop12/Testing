import { Router } from "express";
import { requireApiKey, type AuthRequest } from "../../lib/auth.js";

const router = Router();

router.get("/usage", requireApiKey, (req: AuthRequest, res) => {
  const key = req.apiKey!;

  const now = new Date();
  const resetAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );

  res.json({
    key_id: key.keyId,
    plan: key.plan,
    requests_today: key.requestsToday,
    requests_limit: key.dailyLimit,
    requests_remaining: Math.max(0, key.dailyLimit - key.requestsToday),
    reset_at: resetAt.toISOString(),
    created_at: key.createdAt.toISOString(),
  });
});

export default router;
