import { Router } from "express";
import { requireApiKey, type AuthRequest } from "../../lib/auth.js";
import { resolveStream } from "../../lib/ytdlp.js";
import { GetStreamQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/stream", requireApiKey, async (req: AuthRequest, res, next) => {
  const parsed = GetStreamQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "bad_request",
      message: "Missing required parameter: query",
    });
    return;
  }

  const { query, format } = parsed.data;

  try {
    const result = await resolveStream(query, format ?? "best");
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
