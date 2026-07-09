import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// yt-dlp binary path — falls back to system yt-dlp for Render/production
const YTDLP_BIN =
  process.env["YTDLP_PATH"] ||
  "/home/runner/workspace/yt-dlp";

const BASE_OPTS = [
  "--no-warnings",
  "--no-playlist",
  "--quiet",
  "--socket-timeout", "20",
];

/** Allowed YouTube URL hosts — mitigates SSRF */
const ALLOWED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "m.youtube.com",
  "music.youtube.com",
]);

/** Validate a URL is a whitelisted YouTube domain or reject it */
function validateExternalUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(`URL host '${parsed.hostname}' is not allowed. Only YouTube URLs are supported.`);
  }
}

export interface YtdlpTrack {
  id: string;
  title: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  webpage_url: string;
  url?: string;
}

function parseTrack(raw: YtdlpTrack) {
  const artist = raw.uploader?.replace(/ - Topic$/, "") ?? "";
  return {
    track_id: raw.id,
    title: raw.title,
    artist,
    duration: raw.duration ?? 0,
    thumbnail: raw.thumbnail ?? "",
    source_url: raw.webpage_url,
  };
}

/** Run yt-dlp and return a single parsed JSON object */
async function ytdlpSingle(args: string[]): Promise<YtdlpTrack> {
  const { stdout } = await execFileAsync(YTDLP_BIN, [...BASE_OPTS, ...args], {
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout.trim()) as YtdlpTrack;
}

/** Run yt-dlp and return NDJSON parsed as an array (for search results) */
async function ytdlpNdjson(args: string[]): Promise<YtdlpTrack[]> {
  const { stdout } = await execFileAsync(YTDLP_BIN, [...BASE_OPTS, ...args], {
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as YtdlpTrack);
}

/** Search YouTube for tracks, return up to `limit` results */
export async function searchTracks(query: string, limit: number = 5) {
  const searchUrl = `ytsearch${limit}:${query}`;
  const tracks = await ytdlpNdjson([
    searchUrl,
    "--dump-json",
    "--no-download",
  ]);
  return tracks.slice(0, limit).map(parseTrack);
}

/** Resolve a query or YouTube URL to a direct stream link */
export async function resolveStream(
  query: string,
  format: string = "best",
): Promise<{
  track_id: string;
  title: string;
  artist: string;
  duration: number;
  stream_url: string;
  expires_in: number;
  thumbnail: string;
  source_url: string;
}> {
  const isUrl = /^https?:\/\//.test(query);

  if (isUrl) {
    // SSRF guard — only allow known YouTube hosts
    validateExternalUrl(query);
  }

  const target = isUrl ? query : `ytsearch1:${query}`;

  const formatSelector =
    format === "mp3" || format === "opus"
      ? `bestaudio[ext=${format}]/bestaudio`
      : "bestaudio";

  const raw = await ytdlpSingle([
    target,
    "--dump-json",
    "--no-download",
    "--no-playlist",
    "-f", formatSelector,
  ]) as YtdlpTrack & { url?: string };

  if (!raw.url) {
    throw new Error("No stream URL returned by yt-dlp");
  }

  const base = parseTrack(raw);
  return {
    ...base,
    stream_url: raw.url,
    expires_in: 3600,
  };
}
