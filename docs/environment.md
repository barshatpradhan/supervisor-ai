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
| `RATE_LIMIT_MAX_KEYS` | No | `50000` | Hard cap on keys each in-memory limiter store tracks; the oldest window is evicted when full, and expired windows are swept every minute. |
| `TRUST_PROXY_HOPS` | No | `0` | Reverse-proxy hops trusted for the client IP (`X-Forwarded-For`). **Set `1` on Render.** Never use `true`. |
| `AUTH_RL_LOGIN_WINDOW_MS` | No | `900000` | Login per-IP and per-email window (15 min). |
| `AUTH_RL_LOGIN_IP_MAX` | No | `30` | Failed logins per client IP per window. |
| `AUTH_RL_LOGIN_EMAIL_MAX` | No | `20` | Failed logins per email (any IP) per window. |
| `AUTH_RL_LOGIN_PAIR_WINDOW_MS` | No | `600000` | Login per IP+email window (10 min). |
| `AUTH_RL_LOGIN_PAIR_MAX` | No | `5` | Failed logins per IP+email pair per window (the strictest). |
| `AUTH_RL_REGISTER_WINDOW_MS` | No | `3600000` | Register / legacy signup window (1 h). |
| `AUTH_RL_REGISTER_IP_MAX` | No | `5` | Register attempts per IP per window. |
| `AUTH_RL_REGISTER_EMAIL_MAX` | No | `3` | Register attempts per email per window. |
| `AUTH_RL_RESET_IP_WINDOW_MS` | No | `900000` | Password-reset request and confirm per-IP window (15 min). |
| `AUTH_RL_RESET_IP_MAX` | No | `5` | Password-reset requests per IP per window. |
| `AUTH_RL_RESET_EMAIL_WINDOW_MS` | No | `3600000` | Password-reset per-email window (1 h). |
| `AUTH_RL_RESET_EMAIL_MAX` | No | `3` | Password-reset requests per email per window. |
| `AUTH_RL_RESET_EMAIL_DAILY_MAX` | No | `5` | Password-reset requests per email per UTC day. |
| `AUTH_RL_RESET_DAILY_TOTAL_MAX` | No | `100` | Password-reset requests for the whole app per UTC day (protects the 300/day email quota). |
| `AUTH_RL_RESET_CONFIRM_IP_MAX` | No | `10` | Password-reset confirmations per IP per window. |
| `AUTH_RL_INVITATION_WINDOW_MS` | No | `900000` | Invitation endpoints per-IP window (15 min). |
| `AUTH_RL_INVITATION_INSPECT_IP_MAX` | No | `30` | Invitation lookups per IP per window. |
| `AUTH_RL_INVITATION_REGISTER_IP_MAX` | No | `10` | Invitation account registrations per IP per window. |
| `AUTH_RL_INVITATION_ACCEPT_IP_MAX` | No | `20` | Invitation acceptances per IP per window. |
| `AUTH_RL_ADMIN_CREATE_USER_WINDOW_MS` | No | `3600000` | Platform-admin user creation window (1 h). |
| `AUTH_RL_ADMIN_CREATE_USER_MAX` | No | `20` | Users a platform admin can create per window. |
| `AUTH_RL_AVATAR_UPDATE_WINDOW_MS` | No | `900000` | Avatar change window per signed-in user (15 min). |
| `AUTH_RL_AVATAR_UPDATE_MAX` | No | `20` | Avatar changes (`PATCH /auth/me/avatar`) per user per window. |
| `AUTH_RL_UPSTREAM_RETRY_AFTER_SECONDS` | No | `60` | Retry-After sent when Supabase Auth itself rate-limits a sign-in. |
| `EMAIL_DAILY_QUOTA` | No | `300` | Emails per day the transactional provider allows (shared by password resets and invitations). |
| `INVITATION_EMAIL_DAILY_PER_USER_MAX` | No | `25` | Organization invitation emails each inviting user can send per UTC day. |
| `INVITATION_EMAIL_DAILY_TOTAL_MAX` | No | `EMAIL_DAILY_QUOTA - AUTH_RL_RESET_DAILY_TOTAL_MAX` (200) | Invitation emails for the whole app per UTC day. Startup fails if this plus `AUTH_RL_RESET_DAILY_TOTAL_MAX` exceeds `EMAIL_DAILY_QUOTA`. |
| `TRANSACTIONAL_EMAIL_PROVIDER` | Required for invitations | — | Invitation email provider selector: `brevo` for real delivery or explicit `console` for offline development/tests. |
| `BREVO_API_KEY` | Conditional | — | Required when Brevo is selected. Backend-only secret. |
| `INVITATION_EMAIL_FROM` | Conditional | — | Required when Brevo is selected. Must be a sender verified in Brevo (Senders & IPs). |
| `INVITATION_EMAIL_FROM_NAME` | No | `Supervisor AI` | Display name for the invitation sender. |

Verification-only variables (`*_TEST_PASSWORD`, `TENANT_ISOLATION_API_BASE_URL`, and `TASK_PROGRESS_*`) must never be set in production.
