---
name: yt-dlp NixOS install
description: How to install yt-dlp in the Replit NixOS environment (pip doesn't work)
---

pip install yt-dlp fails in NixOS with PEP 668 error. `--break-system-packages` fails with permission denied on /nix/store. `--user` also fails.

**Solution:** Download the yt-dlp binary directly from GitHub releases:
```bash
curl -sL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /home/runner/workspace/yt-dlp && chmod +x /home/runner/workspace/yt-dlp
```

**Why:** NixOS locks the Python site-packages directory; the binary approach bypasses Python packaging entirely.

**How to apply:** Set `YTDLP_PATH=/home/runner/workspace/yt-dlp` or hard-code this path in server code for dev. For Render/production, use the build command to install to /usr/local/bin/yt-dlp.
