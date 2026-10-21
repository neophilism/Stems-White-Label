# Portable Stems White Label (zero-cost host first)

This repository can run in two deployment modes without changing the app feature code:

1. **Netlify Free + OpenNext:** connect `neophilism/Stems-White-Label` and use `netlify.toml`. Netlify supports Next.js 16 SSR/App Router, including API handlers. Configure runtime secrets via the protected site environment. The 300 credits/month are shared across all sites in the team, with a hard cutoff. A free site is not an unlimited 24/7 background worker.
2. **Immutable Node 22 OCI image:** manual GitHub Actions publication at `ghcr.io/neophilism/stems-white-label:sha-<commit>`. For a verified free container/VM, run on port 3000 using restricted runtime secrets. Images are not hosting.

**Private configuration to migrate securely from the suspended Render site:** original Neon restricted `DATABASE_URL`, exact new public `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DEFAULT_TENANT_SLUG` if required, and existing media/S3, payment and OAuth credentials appropriate to the specific preview. Copy directly between protected provider secret stores, not GitHub source or chat. Run the repo's existing Prisma migrations exactly once with a privileged direct connection, separate from ongoing runtime; image startup skips implicit `prestart` database writes to avoid collisions.

**Media processing:** `worker:assets` and `worker:packages` are separate background processes, not automatically started on serverless Netlify. Actual stem upload processing and license delivery require those workers on an appropriate host or an explicitly verified queue/cron alternative. The public synchronized *preview player* can work with already-processed READY assets and signed private S3 URLs. Verify real owner files and playback before calling stems usable tonight.

After the new site exists: set GitHub repo variable `STEMS_SITE_URL` to its verified HTTPS origin, run `Public deployment readiness (on-demand)`, confirm `/api/health` and `/api/ready` and manually test private stem asset playback. The old scheduled GitHub smoke on suspended Render has been removed to conserve free CI minutes. A green code build does **not** imply the host is live.
