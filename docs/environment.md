# Backend environment configuration

The backend reads environment configuration at startup and fails fast if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. In production it also requires `GEMINI_API_KEY` and explicit non-local `CORS_ORIGINS`.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Set to `production` in deployed environments. |
| `PORT` | No | `5000` | Positive integer. |
| `APP_VERSION` | No | `0.0.0` | Returned by health checks. |
| `SUPABASE_URL` | Yes | — | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Backend-only secret; never expose it to clients or logs. |
| `GEMINI_API_KEY` | Production | — | Required in production; backend analysis credential. |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model identifier. |
| `CORS_ORIGINS` | Production | `FRONTEND_APP_URL` or localhost | Comma-separated trusted origins. Wildcards and localhost are rejected in production. |
| `FRONTEND_APP_URL` | Required for invitations | — | Used for invitation and password-reset links and as development CORS fallback. Configure `http://localhost:5173` locally. Add `${FRONTEND_APP_URL}/reset-password` to the Supabase Auth redirect allow list. |
| `JSON_BODY_LIMIT` | No | `1mb` | Maximum JSON payload size. File uploads have their own 10 MB limit. |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | In-memory limiter window. Use a shared limiter before multi-instance deployment. |
| `RATE_LIMIT_MAX` | No | `120` | Requests per client IP per window. |
| `TRANSACTIONAL_EMAIL_PROVIDER` | Required for invitations | — | Invitation email provider selector: `resend` for real delivery or explicit `console` for offline development/tests. |
| `RESEND_API_KEY` | Conditional | — | Required when Resend is selected. |
| `INVITATION_EMAIL_FROM` | Conditional | — | Required when Resend is selected. |

Verification-only variables (`*_TEST_PASSWORD`, `TENANT_ISOLATION_API_BASE_URL`, and `TASK_PROGRESS_*`) must never be set in production.
