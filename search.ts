import { Router } from "express";
import { requireApiKey, type AuthRequest } from "../../lib/auth.js";
import { searchTracks } from "../../lib/ytdlp.js";
import { SearchTracksQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/search", requireApiKey, async (req: AuthRequest, res, next) => {
  const parsed = SearchTracksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "bad_request",
      message: "Missing required parameter: query",
    });
    return;
  }

  const { query, limit } = parsed.data;

  try {
    const results = await searchTracks(query, limit ?? 5);
    res.json({
      results,
      total: results.length,
      query,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
