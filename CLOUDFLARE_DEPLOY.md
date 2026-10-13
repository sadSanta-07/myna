# MYNA on Cloudflare Workers (experimental)

This directory contains a separate Cloudflare Workers signaling adapter. It does not replace the existing Express server or change the Render deployment.

## Deploy

1. In Cloudflare Workers & Pages, connect this repository and choose the `deploy/cloudflare-signaling` branch.
2. Use no build command and deploy command `npx wrangler deploy`.
3. The repository-root `wrangler.toml` deploys `cloudflare/worker.ts`, serves files from `public/`, and creates the SQLite-backed Durable Object binding.
4. After deployment, check `https://YOUR-WORKER.workers.dev/health`; it should return `OK`.
5. Add TURN credentials as Worker secrets only if you already have valid credentials from a TURN provider:
   - `npx wrangler secret put TURN_USERNAME`
   - `npx wrangler secret put TURN_CREDENTIAL`

## Important limitations

- This is an experimental port and must be tested end-to-end before using it as MYNA's public signaling endpoint.
- The Worker uses one Durable Object for the signaling rooms. This is a simple temporary deployment shape, not a scaling design.
- Cloudflare Workers is not the same runtime as Node.js; do not use the existing `npm run signal` command for this deployment.
- Peer-to-peer connection success still depends on STUN/TURN reachability. STUN alone does not work on every network.
- Keep Render's existing service settings and the `main` branch unchanged until the Cloudflare deployment passes host/guest tests.
