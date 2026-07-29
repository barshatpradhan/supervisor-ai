# Production readiness

## Deployment checklist

- Apply every Supabase migration before deploying the API.
- Set `NODE_ENV=production`, explicit `CORS_ORIGINS`, Supabase secrets, and Gemini credentials.
- Run behind TLS with a reverse proxy/load balancer and configure health probes for `/health` and `/ready`.
- Restrict `/metrics` to the observability network at the proxy layer.
- Replace the in-memory rate limiter with Redis or an edge gateway before horizontal scaling.
- Configure log retention and alert on 5xx rate, readiness failures, upload failures, and Gemini failures.
- Run `npm run lint`, `npm run build`, `npm test`, and `git diff --check` in CI.

## Operational endpoints

| Endpoint | Purpose |
| --- | --- |
| `/health` | Liveness response including uptime, version, and Gemini configuration state. |
| `/ready` | Database readiness probe. |
| `/metrics` | Prometheus text metrics for requests and errors. |
| `/api/docs` | Swagger UI. |
| `/api/openapi.json` | OpenAPI 3.1 document. |
