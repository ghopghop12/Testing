import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { apiKeysTable } from "@workspace/db";
import { CreateApiKeyBody } from "@workspace/api-zod";

const router = Router();

function generateApiKey(): { apiKey: string; keyId: string } {
  const raw = randomUUID().replace(/-/g, "").slice(0, 24);
  const apiKey = `sf_${raw}`;
  const keyId = `kid_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  return { apiKey, keyId };
}

router.post("/keys", async (req, res, next) => {
  const parsed = CreateApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "bad_request",
      message: "email is required",
    });
    return;
  }

  const { email, name } = parsed.data;

  try {
    const { apiKey, keyId } = generateApiKey();
    const id = randomUUID();

    await db.insert(apiKeysTable).values({
      id,
      keyId,
      apiKey,
      email,
      name: name ?? null,
      plan: "free",
      dailyLimit: 500,
    });

    res.status(201).json({
      api_key: apiKey,
      key_id: keyId,
      plan: "free",
      daily_limit: 500,
      message: "Your API key has been created. Keep it safe — it won't be shown again.",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
