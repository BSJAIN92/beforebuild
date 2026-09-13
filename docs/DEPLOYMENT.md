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

### Revoke or restore a beta tester

1. Sign in as an address listed in the server-side `ADMIN_EMAILS` setting.
2. Open **Beta settings**, find the tester under **Email allowlist**, and select **Revoke**.
3. Confirm the row changes to **Revoked** and offers **Restore**. This database record overrides an address that is still present in the `BETA_ALLOWLIST` environment setting.
4. If immediate sign-out is required, also revoke that person's active sessions in Clerk. BeforeBuild revocation blocks application data operations but does not end the separate Clerk login session.
5. To return access later, select **Restore**. The restored address becomes active and is removed from the application waitlist.

After revocation, every protected Convex operation rejects the tester. A running research job checks access again when its worker claims the next stage, cancels any saved provider response identifier, and records a safe stopped-job message. The denied application view adds the still-verified account back to the waitlist for admin review.

Revocation does not delete the Clerk account, saved BeforeBuild ideas, provider records, or data already rendered in an open browser. It is an access block, not remote erasure. For an account-deletion request, separately handle Clerk identity and sessions, Convex records, logs, exports/backups, and any provider-retained data under the adopted retention policy.

### Rotate production secrets

For a routine rotation, keep the old credential active while creating and testing its replacement: **create new → update the only intended consumer → deploy if required → verify → revoke old**. Record only the key's descriptive name, owner, storage location, creation date, and revocation date. Never put the value in Git, tickets, chat, logs, screenshots, or this guide.

If a credential is being actively abused, revoke it first and accept a short outage while installing the replacement. Also inspect provider audit, deployment, and usage logs for activity during the exposure window.

#### Clerk production secret key

1. In the Clerk production instance, create a second Secret Key with a consumer-specific name such as `vercel-production-YYYY-MM-DD`. Do not rotate the publishable key merely because it is visible; it is public by design.
2. Replace only the production `CLERK_SECRET_KEY` value in Vercel. Confirm Preview and Development were not selected.
3. Redeploy production because Vercel environment changes apply only to new deployments.
4. Verify sign-in, email verification, Google sign-in, logout, the same-domain Clerk proxy, and any server-side Clerk API call. Confirm Clerk shows recent use of the new key and no continuing use of the old key.
5. Delete the old Clerk Secret Key. Development and production keys are independent; rotate development separately only if it was also exposed.

Clerk supports multiple active Secret Keys, so this order avoids downtime. If a future Clerk webhook is added, create a replacement endpoint with the same URL and events, update and verify its signing secret, then remove the old endpoint.

#### Convex production deploy key

1. In the production deployment settings, create a new named deploy key with only the `deployment:deploy` permission required by the Vercel build.
2. Replace the production-only `CONVEX_DEPLOY_KEY` in Vercel. Do not assign it to Preview or Development.
3. Redeploy the selected production commit. Verify the build log names the intended production deployment and that schema and functions deploy successfully.
4. Confirm the stable application still reads and writes production data, then delete the old deploy key from Convex.

Deleting a Convex deploy key revokes its access. Old Vercel deployments may still contain the old value, but it will no longer work for a future rebuild; use a new deployment for rollback instead of rebuilding with a revoked key.

#### OpenAI production project key

1. Create a second restricted key inside the dedicated production OpenAI project. Grant only the permissions and models the application needs.
2. Replace `OPENAI_API_KEY` in the production Convex environment. Convex environment changes affect new function executions without a Vercel redeploy.
3. Keep `AI_ENABLED` unchanged during the key swap. If AI is enabled, run one controlled Basic request and one small cited-research request, then check OpenAI project usage and application errors. If AI is disabled, verify the key only when the user separately approves enabling paid requests.
4. Revoke the old project key after the replacement is verified. OpenAI says key revocation takes effect within seconds, while other authentication updates can take up to 15 minutes.

At the time of this beta record, production has no OpenAI key or credit and AI is disabled. This is a future procedure, not evidence that a production OpenAI credential exists.

#### Vercel access token or other hosted secret

For a leaked personal/team Vercel access token, create a replacement with the smallest useful scope, update each CLI or automation consumer, verify it, and revoke the old token. For any third-party secret stored as a Vercel environment variable, create the replacement at its provider first, update the correct Vercel environment, redeploy every dependent project, verify, and only then invalidate the old credential.

After every rotation, confirm the stable production URL, Git commit, Vercel deployment, Convex target, and relevant authentication or provider flow. Keep the previous working deployment for comparison, but remember that an old deployment keeps its old environment values and may fail after the old credential is revoked.

### Roll back Vercel without breaking Convex

Vercel Instant Rollback redirects the production domains to an existing older frontend build; it does not rebuild that deployment and does not restore an older Convex database, schema, or function set. Treat the frontend and backend as two separate release surfaces.

Before every production release, record its commit and deployment ID plus the immediately previous Ready production deployment. At the time this checklist was verified, the live release was commit `c65915e` on deployment `dpl_AAaVyTy9EvYtGEoaD9tAD3Vm9y6H`. The immediately previous Ready production deployment was `dpl_J4Mu6v5CpVp2rN65kNrpJdtgLvnb` from commit `b1e6af8`. The Git comparison showed no change under `convex/` between those commits, so the previous deployment is currently a backend-compatible rollback candidate. Recheck this at incident time rather than trusting a stale record.

#### Pre-rollback check

1. Confirm the current production problem and record its start time, affected route, current Vercel deployment ID, Git commit, and useful request IDs. Do not record user idea content or secrets.
2. Identify a previous deployment that was Ready and actually served production traffic. On Vercel Hobby, only the immediately previous production deployment is eligible for Instant Rollback.
3. Compare the candidate commit with the bad commit, paying special attention to `convex/schema.ts`, public Convex queries/mutations/actions, function argument and return shapes, indexes, authentication configuration, and required environment-variable names.
4. Confirm the current Convex backend still supports the older frontend: every function it calls still exists; accepted arguments and returned data remain compatible; required indexes still exist; and older writes still satisfy the current schema.
5. Check whether any credential or Vercel environment value was changed after the candidate was built. Instant Rollback restores the old build with its old environment values, so a revoked key can make an otherwise good deployment fail.
6. If Convex compatibility or credentials are uncertain, do not perform a frontend-only rollback. Prefer a forward fix, or prepare a separately reviewed compatible backend deployment and data migration. Never blindly deploy an old Convex schema: it can reject newer documents or delete indexes absent from the old schema.

#### Execute only with explicit production approval

From the linked application repository, use the exact reviewed deployment ID or URL:

```sh
vercel rollback <known-good-deployment-id-or-url>
vercel rollback status canvasbeforebuild
```

The rollback changes live routing, so it requires approval that names the target production deployment. Do not use `vercel redeploy` as an emergency substitute: redeploying rebuilds with current environment settings and runs the configured Convex deployment command again.

#### Verify and return to normal deployment

1. Confirm the stable production domain points to the intended deployment and returns a successful response.
2. Check recent Vercel and Convex errors, then test signed-out routing, admin sign-in, allowed-tester access, denied-user blocking, and one create/edit/save/reopen operation. Test AI only if it is enabled and paid-provider use is separately approved.
3. Confirm the production frontend still targets the production Convex deployment, `BILLING_ENABLED` remains false, and the daily Convex function-call limits remain active.
4. Keep the incident rollback active while fixing and testing a new deployment. Vercel turns off automatic production-domain assignment after an Instant Rollback, so a new push may build without becoming live.
5. After the fix passes checks, explicitly promote the reviewed fixed deployment:

```sh
vercel promote <fixed-deployment-id-or-url>
vercel promote status
```

Promotion exits rollback mode and restores automatic production-domain assignment. Verify the stable domain and service checks again.

A temporary public demo should use demo mode with no real secrets or sensitive test ideas. Do not describe that demo as private or as doing live research. Turning off demo mode and changing any `NEXT_PUBLIC_*` setting requires a new frontend build.

The app has not been temporarily hosted from the delivery environment; deployment requires your connected accounts and credentials.

Primary references: https://docs.convex.dev/production/hosting/vercel, https://docs.convex.dev/auth/clerk, https://docs.convex.dev/cli/deploy-key-types, https://docs.convex.dev/production/overview, https://docs.convex.dev/database/reading-data/indexes/, https://vercel.com/docs/environment-variables/rotating-secrets, https://vercel.com/docs/instant-rollback, https://clerk.com/docs/guides/secure/rotate-api-keys, and https://developers.openai.com/api/reference/overview
