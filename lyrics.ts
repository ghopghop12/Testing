import { Router } from "express";
import { requireApiKey, type AuthRequest } from "../../lib/auth.js";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const YTDLP_BIN = process.env["YTDLP_PATH"] || "/home/runner/workspace/yt-dlp" || "yt-dlp";

const router = Router();

router.get("/lyrics", requireApiKey, async (req: AuthRequest, res, next) => {
  const trackId = req.query["track_id"] as string | undefined;
  const query = req.query["query"] as string | undefined;

  if (!trackId && !query) {
    res.status(400).json({
      error: "bad_request",
      message: "Provide either track_id or query parameter",
    });
    return;
  }

  try {
    const target = trackId
      ? `https://www.youtube.com/watch?v=${trackId}`
      : `ytsearch1:${query}`;

    // Try to get auto-generated subtitles via yt-dlp
    const { stdout } = await execFileAsync(
      YTDLP_BIN,
      [
        target,
        "--dump-json",
        "--no-download",
        "--no-playlist",
        "--no-warnings",
        "--quiet",
        "--socket-timeout", "20",
      ],
      { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
    );

    const info = JSON.parse(stdout) as {
      id: string;
      title: string;
      uploader?: string;
      automatic_captions?: Record<string, unknown[]>;
      subtitles?: Record<string, unknown[]>;
    };

    const hasCaptions =
      (info.automatic_captions && Object.keys(info.automatic_captions).length > 0) ||
      (info.subtitles && Object.keys(info.subtitles).length > 0);

    if (!hasCaptions) {
      res.status(404).json({
        error: "not_found",
        message: "No lyrics/captions found for this track",
      });
      return;
    }

    // Return metadata indicating lyrics are available (synced captions)
    res.json({
      track_id: info.id,
      title: info.title,
      artist: info.uploader?.replace(/ - Topic$/, "") ?? "",
      lyrics: "[Lyrics available via auto-captions. Use track_id with a lyrics provider for full text.]",
      synced: true,
      source: "youtube-auto-captions",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
