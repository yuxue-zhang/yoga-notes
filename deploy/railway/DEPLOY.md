# Railway deployment

Status: prepared, not deployed. Connect Railway before provisioning resources.

Use repository root as build context; Dockerfile deploy/railway/Dockerfile and config deploy/railway/railway.toml. Copy dockerignore.template to repository-root .dockerignore before uploading a build context. Never upload local .env, runtime, photos or tools.

Set YOGA_WEB_USER and a unique YOGA_WEB_PASSWORD of at least 16 characters as platform secrets. Set YOGA_PUBLIC_ORIGIN to the exact generated HTTPS origin, without trailing slash. Set model variables using app/.env.example; do not disable quota protection. Do not configure personal-character model keys. Existing local secrets are not copied automatically.

Mount a persistent volume at /opt/yoga/app/runtime. Run exactly one replica; this app serializes jobs within one process. Disable automatic sleeping for long processing jobs. Health endpoint tests gateway availability only; after deployment authenticate and verify /api/config has ready=true and mediaReady=true.

Verify unauthenticated requests are 401, foreign origins are 403, settings/characters APIs are inaccessible, the default artwork loads, and browser export works. Do not run model analysis or resume old courses without an explicitly submitted test course. GitHub Pages integration is pending the real deployment URL; use the authenticated hosted app as the first working entry point.

Public interface: only /api/config and /api/jobs routes are exposed. Original local server, preview/print renderer and default girl assets are unchanged.
