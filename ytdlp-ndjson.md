---
name: yt-dlp NDJSON parsing
description: yt-dlp --dump-json for multi-result searches emits newline-delimited JSON, not a single JSON object
---

When yt-dlp is given a search URL like `ytsearch5:query` with `--dump-json`, it writes one JSON object per line (NDJSON). Calling `JSON.parse(stdout)` on the full output throws a SyntaxError.

**Solution:** Split and parse per line:
```typescript
stdout.split('\n').filter(line => line.trim()).map(line => JSON.parse(line))
```

**Why:** yt-dlp uses streaming NDJSON for multi-entry results. Single-entry (direct URL / ytsearch1:) returns a single JSON object which IS safe to parse directly.

**How to apply:** Use separate functions for single-result (ytdlpSingle) and multi-result (ytdlpNdjson) yt-dlp calls.
