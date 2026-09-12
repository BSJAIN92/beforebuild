# Private beta deployment checklist

Use a separate development and production deployment. The standalone demo is not an access-controlled beta.

## Environment placement

| Variable | Next.js / Vercel | Convex deployment | Meaning |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | `false` for real beta | No | Explicit client demo switch; requires rebuild |
| `NEXT_PUBLIC_CONVEX_URL` | Yes / supplied by Convex build command | No | Correct deployment URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | No | Clerk instance, public by design |
| `CLERK_SECRET_KEY` | Yes, secret | No | Server-side Clerk key |
| `NEXT_PUBLIC_CLERK_PROXY_URL` | Production proxy only | No | Public same-origin Clerk proxy URL, such as `https://app.example/__clerk/` |
| `CONVEX_DEPLOY_KEY` | Build secret | No | Vercel deploys the intended backend |
| `CLERK_JWT_ISSUER_DOMAIN` | Not consumed here | Yes | Must match the Clerk instance |
| `ADMIN_EMAILS` | No | Yes | Comma-separated verified owner emails |
| `BETA_ALLOWLIST` | No | Optional | Initial tester emails; database revocation overrides |
| `OPENAI_API_KEY` | No | Yes, secret | AI API access |
| `AI_PROVIDER` | No | Yes | `openai` by default |
| `OPENAI_BASE_URL` | No | Optional | Trusted HTTPS Responses-compatible endpoint |
| `AI_INTERVIEW_MODEL` | No | Optional | Structured canvas interview model |
| `AI_RESEARCH_MODEL` | No | Optional | Focused native web-search model |
| `AI_DEEP_RESEARCH_MODEL` | No | Optional | Deep-research model |
| `AI_DEEP_SEARCH_TOOL` | No | Optional | `web_search_preview` default for deep model |
| `AI_MAX_DAILY_TURNS` | No | Optional | Default 80, per user per UTC day |
| `AI_MAX_DAILY_RESEARCH` | No | Optional | Default 3, per user per UTC day |
| `AI_MAX_IDEAS` | No | Optional | Default/hard ceiling 30 |
| `BILLING_ENABLED` | No | `false` | No checkout is implemented |
| `PRICE_CURRENCY` | No | Optional | USD default |
| `INTERMEDIATE_PRICE_CENTS` | No | Optional | Initial configurable price, not charged |
| `ADVANCED_PRICE_CENTS` | No | Optional | Initial configurable price, not charged |

Convex database pricing settings override the initial price environment values. Supported UI currencies are USD, EUR, GBP and INR. Amounts are integer minor units; the `*_CENTS` naming is historical.

## Before deploying

1. Install dependencies, inspect/audit resolved versions, and commit the generated lockfile. Do not use `npm ci` until a lockfile exists. Run `npx convex dev` against development to generate actual API bindings.
2. Configure verified-email sign-in and the Convex integration in Clerk. Confirm the signed identity includes email and the true boolean email-verification claim. Missing verification must remain a denial, not be bypassed in application code.
3. Set Convex development environment values. Run all domain tests, full typecheck and full Next.js build. Then complete the live two-account tests in `TESTING.md`.
4. Configure production Clerk and match its frontend keys to the production Convex issuer. Prefer an owned custom domain with Clerk's DNS setup. If an owned domain is unavailable, this app can use Clerk's advanced Frontend API proxy: deploy the `/__clerk` middleware route first, then have Clerk validate that resolving URL and set `NEXT_PUBLIC_CLERK_PROXY_URL` to the full HTTPS proxy URL ending in `/__clerk/`. Do not enable the proxy for a development Clerk instance.
5. Set distinct production Convex environment values, including the owner email and provider key. Keep billing disabled. Set project-level AI spending controls and small daily research budgets.

## Vercel settings

Framework: Next.js. Runtime: Node.js 22. Build command:

```sh
npx convex deploy --cmd 'npm run build'
```

The Convex CLI uses `CONVEX_DEPLOY_KEY` and supplies the correct public backend URL to the frontend build. Explicit URL configuration must not point a production frontend at development data. The deploy key is a build secret, never a public variable.

Do not apply the production deploy key to untrusted preview builds. Use isolated preview/development projects and separate credentials, following Convex’s documented preview deployment flow.

After deploying, sign in as the configured admin, allow one test account, and verify that account can create an idea. An unlisted account may authenticate with Clerk but must remain unable to read or change any application data. An allowlist entry does not send mail: share the beta URL directly.

## Check actual AI execution

Complete a Basic idea and confirm the provider receives structured interview requests without web tools. Create an Intermediate idea and answer twice; verify the state changes to research and that the final report has real source annotations. Repeat with Advanced, verifying the configured deep model and larger investigation budget.

Navigate away while a research request is running, then return. Cancel one request and verify its delayed response cannot overwrite later work. Retry a failed synthesis without duplicating the founder answer or restarting an already saved research report. Verify rate-limit errors are readable and contain no raw keys or provider payloads.

## Operations

Monitor Convex function failures, provider usage, long-running research and false access denials. Use access-controlled logs; do not add raw idea/prompt logging casually. Establish a backup/retention policy and a support channel before inviting users. The app has record deletion and exports, not a full account-erasure orchestration across Clerk, logs and provider backups.

A temporary public demo should use demo mode with no real secrets or sensitive test ideas. Do not describe that demo as private or as doing live research. Turning off demo mode and changing any `NEXT_PUBLIC_*` setting requires a new frontend build.

The app has not been temporarily hosted from the delivery environment; deployment requires your connected accounts and credentials.

Primary references: https://docs.convex.dev/production/hosting/vercel and https://docs.convex.dev/auth/clerk
