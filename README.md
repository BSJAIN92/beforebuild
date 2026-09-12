# BeforeBuild

**Get clear before you start building.** A validation-first workspace for solo founders and small teams exploring micro-SaaS and other small-business ideas.

The app turns a raw idea into a plain-language conversation and a live, editable nine-section Business Model Canvas. Every completed exploration also includes constructive challenges, explicit assumptions and prioritized validation experiments. Research-backed levels add cited research before deeper questions. The founder always chooses whether to accept, revise or disagree.

## Start here

| What you need | What to open |
| --- | --- |
| Try the interface immediately, without accounts or keys | `dist/beforebuild-demo.html` in a modern desktop browser |
| Run the Next.js demo locally | `npm install`, copy `.env.example` to `.env.local`, then `npm run dev` |
| Connect real users, storage and AI | Follow **Connected setup** below and `docs/DEPLOYMENT.md` |
| Review verification and launch checks | `docs/TESTING.md` |
| Inspect the same domain logic used by both modes | `lib/` |

**The standalone demo is scripted, not AI-generated.** It makes no network calls, performs no searches, and does not authenticate anyone. It saves in the current browser when local storage is available; otherwise it works in memory and displays a warning. Export before closing a memory-only session. Demo allowlist controls do not restrict actual access. Demo data is not automatically imported into a connected account.

**Connected mode is implemented in the source, but has not been exercised against live Clerk, Convex or OpenAI accounts in the delivery environment.** Those credentials were not supplied. Dependency installation was unavailable, so a full Next.js production build is also unverified. Do the integration checks before inviting testers; this is a beta implementation, not an audited production service.

## The three levels

| Level | Interview target | Research | Beta access |
| --- | --- | --- | --- |
| Basic | 3–5 answers | None; only founder input and clearly labeled proposals | Free |
| Intermediate | 6–10 total answers | Focused AI-led research on problems, alternatives, pricing approaches and customer channels | Free for invited testers |
| Advanced | 12–18 total answers | Deeper AI-led investigation of competition, switching friction, distribution, economics, retention and counterevidence | Free for invited testers |

These are question budgets, not time estimates. The connected coach may finish within the range when context is sufficient. The scripted demo uses the maximum. Users may explicitly request an early draft, with unanswered areas labeled assumptions. Intermediate and Advanced still research before an early final draft.

Research normally starts after the first two answers establish context. The next question is generated using the completed report. An upgrade preserves the same idea record, answers, manual edits, previous research, founder decisions and completed experiments. Advanced adds a deeper report even if Intermediate research already exists. Each research depth is run once per idea; a major pivot should start a new idea, or you can extend the source with explicit research refresh/versioning.

Every finished canvas has all nine sections: customer segments, value proposition, channels, customer relationships, revenue streams, key resources, key activities, key partners and cost structure. Completing a canvas does not mean a business has been validated.

## Included product behavior

- Conversational interview, one focused question per turn, optional examples and an “I’m not sure yet” path. The canvas updates after each completed turn. Desktop is side-by-side; mobile switches between conversation and canvas.
- Direct editing and renaming; manually edited sections are locked against later AI replacement. The user can edit them again. Evidence labels distinguish founder statements, source-backed research and untested assumptions. A founder statement is not independently verified evidence.
- Assumptions with a suggested test and recorded founder decisions; validation experiments include hypotheses, steps, measurable decision thresholds, effort and completion tracking.
- Multiple private saved ideas, a searchable library, deletion, Markdown and structured JSON exports, and a browser print view. “Save as PDF” uses the browser’s print dialog. There is no server-side PDF service or JSON import feature.
- Verified-email allowlist, administrative allowlist management, configurable prices and disabled billing. Adding an email grants access but does **not** send an invitation email.
- Saved background research state, polling, retries, cancellation, stale-result protection, daily usage budgets and per-idea size limits.

## Architecture

```text
Next.js / React on Vercel
    ├── Clerk sign-in and Convex authentication provider
    ├── shared, dependency-free TypeScript workspace renderer
    └── authenticated Convex queries and mutations
            ├── owner-scoped ideas, settings, allowlist and usage ledger
            ├── scheduled Node actions for AI calls
            └── provider adapter: Responses API
                    ├── structured interview and canvas output
                    ├── native web search
                    └── native deep research + background retrieval
```

React mounts the workspace renderer from `lib/ui.ts`; the standalone demo runs that **same renderer**, not a separate mock design. This keeps the offline preview and connected interface consistent. `components/live-backend.ts` implements the same backend interface as `lib/demo.ts`.

Important files:

```text
app/                       Next.js shell, styles and safe error boundary
components/                Clerk/Convex integration and live backend adapter
lib/model.ts               Idea model, canvas sections and tier budgets
lib/ui.ts                  Shared browser UI and interactions
lib/ai-contract.ts         Structured response schema, validation and safe merge
lib/demo.ts                Explicitly scripted local backend
lib/export.ts              Portable idea exports
convex/access.ts           Verified-email access and admin allowlist
convex/ideas.ts            Owner-scoped public queries/mutations
convex/jobs.ts              Internal research job state transitions
convex/runner.ts            Internal scheduled AI worker
convex/providers.ts        Configurable server-only provider adapter
convex/schema.ts           Database schema
convex/guards.ts            Ownership, input size, concurrency and daily budgets
convex/settings.ts         Configurable prices; checkout deliberately disabled
scripts/build-demo.mjs      Bundle the standalone, zero-network demo
scripts/test.mjs            Domain/UI typecheck, syntax check and mocked tests
```

### AI configuration

Initial defaults are `gpt-4.1-mini` for the interview, `gpt-4.1` with hosted `web_search` for Intermediate, and `o3-deep-research` with `web_search_preview` for Advanced. The deep-research tool follows the provider’s deep-research examples; its type is configurable separately. There is no separate search API, search scraper, or client-side AI key.

`AI_PROVIDER=openai` selects the initial adapter. `openai-compatible` may use a trusted HTTPS `OPENAI_BASE_URL`, but that endpoint must support the **Responses API, strict structured output, native web tools and background jobs**. A generic chat-completions endpoint is not enough. Other providers require implementing the small `AIProvider` interface and adding a factory entry; changing one environment variable cannot create an unsupported integration.

Source links are taken from provider URL annotations. A research response without verifiable citation annotations fails rather than being saved as evidence. The merge layer removes unknown source IDs and downgrades unsupported research-labeled canvas entries to assumptions. This does not prove that a cited page supports every AI interpretation; founders still need to review sources and test demand.

## Connected setup

### 1. Install and configure the frontend

Use Node.js 22 or later.

```bash
npm install
cp .env.example .env.local
```

The package manifest uses version ranges. A lockfile is not supplied because npm registry access was unavailable during creation. Resolve dependencies in your environment, run an audit, complete the build/tests, and commit the resulting `package-lock.json` before relying on reproducible deployments.

For a local UI preview, leave `NEXT_PUBLIC_DEMO_MODE=true` and run `npm run dev`. The standalone HTML does not need npm at all.

### 2. Configure Clerk and Convex

Create a Clerk application with verified email sign-in and activate its Convex integration. Configure a Convex project with the Clerk issuer URL and the `convex` token audience. This app requires the signed token to provide the primary email and a truthful boolean email-verification claim; do not hardcode an unverified account as verified.

Set these values in `.env.local` for Next.js:

```dotenv
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_CONVEX_URL=https://YOUR-DEPLOYMENT.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_CLERK_SECRET_KEY
```

Set the following **on the Convex deployment**, not only in Vercel or the local Next.js environment:

```dotenv
CLERK_JWT_ISSUER_DOMAIN=https://YOUR-CLERK-ISSUER
ADMIN_EMAILS=owner@example.com
BETA_ALLOWLIST=first-tester@example.com,second-tester@example.com
OPENAI_API_KEY=YOUR_SERVER_ONLY_KEY
AI_PROVIDER=openai
AI_INTERVIEW_MODEL=gpt-4.1-mini
AI_RESEARCH_MODEL=gpt-4.1
AI_DEEP_RESEARCH_MODEL=o3-deep-research
AI_DEEP_SEARCH_TOOL=web_search_preview
BILLING_ENABLED=false
```

Use the Convex dashboard’s environment settings or the Convex CLI. Add the real owner’s verified email to `ADMIN_EMAILS` before the first admin sign-in. Do not commit keys, paste them into the app or put them in a `NEXT_PUBLIC_*` variable.

Run `npx convex dev` to initialize/sync the backend and regenerate `convex/_generated/`. The checked-in generated directory contains bootstrap bindings; real code generation provides project-specific typed API references. If initial setup creates the project before environment values are present, stop after initialization, set the deployment environment, and run it again. The issuer must be configured before successful auth deployment.

In a second terminal:

```bash
npm run dev
```

Sign in with the configured owner email. Open **Beta settings** to allow another verified email. Share your app URL with that tester yourself; the app does not send invitation messages. Database revocation overrides `BETA_ALLOWLIST`; server-configured admin access is changed through `ADMIN_EMAILS`.

### 3. Deploy on Vercel

Push the project to a private repository and import it into Vercel as a Next.js project. Configure Clerk for the intended hosted domain. For production Clerk, follow the custom-domain requirements rather than assuming a generic `vercel.app` domain is sufficient.

Set Vercel’s Clerk keys, `NEXT_PUBLIC_DEMO_MODE=false`, and `CONVEX_DEPLOY_KEY` for the intended production deployment. Ensure all AI/auth/admin settings are set on **Convex production**, separately from development. Use the build command:

```bash
npx convex deploy --cmd 'npm run build'
```

The Convex CLI supplies the deployment URL to the Next.js build. Keep any explicit `NEXT_PUBLIC_CONVEX_URL` consistent with that deployment. Rebuild after changing public environment values. See `docs/DEPLOYMENT.md` for the launch checklist.

## Privacy, safety and beta limits

Every public data operation checks a verified identity, allowlist membership and, for idea records, the immutable owner token identifier. Admin privileges grant allowlist/pricing management, not browsing other founders’ ideas. The UI is not the authorization boundary. Worker jobs recheck email access before each stage and ignore stale results after cancellation/deletion.

Raw idea text, relevant answers, canvas content and research context are sent to the configured AI provider in connected mode. Research may generate public web queries from that context. Never enter secrets, credentials or personal customer information. The app does not publish an idea page, but the provider still processes its content.

Interview requests use `store:false`; background research uses stored responses so retrieval can work. Completed responses are deleted on a best-effort basis after the report is saved in Convex. This is **not** a zero-data-retention guarantee. Provider logging/retention, backups and operational policies remain applicable. Cancellation cannot guarantee that an already submitted AI request stops billing or processing immediately. Deleting an idea removes the app record, not necessarily all provider/backend backups.

Default budgets are 80 interview turns and 3 research starts per user per UTC day, at most 30 saved ideas, 100 conversation messages per idea and 420,000 UTF-8 bytes per saved idea. Research uses 7 or 35 tool calls for Intermediate/Advanced and a roughly 31-minute watchdog. Retried requests consume usage; successful stored research is reused when retrying its subsequent interview turn. Limits are not a dollar-denominated spending guarantee. Set provider-level project budgets and monitor usage during the beta.

Configure limits with `AI_MAX_DAILY_TURNS`, `AI_MAX_DAILY_RESEARCH` and `AI_MAX_IDEAS`. Costlier model choices can increase spending even with the same question limits.

## Billing later

Basic is free. Prices for Intermediate and Advanced are configurable integer minor-unit amounts with a currency. The UI can save those future prices, but **there is no checkout, payment provider or payment entitlement service**. Keep `BILLING_ENABLED=false`; enabling it deliberately blocks non-Basic AI operations instead of silently giving paid access without payment.

For future per-idea billing, add verified payment webhooks, idempotent event processing and an owner/idea/tier entitlement record, then check that entitlement in the existing server-side guard. Define whether upgrading charges a difference and how refunds affect access. Do not trust a client-side “paid” flag. Team workspaces, real-time collaboration and subscription billing are not included.

## Verification

```bash
npm test
npm run demo:build
npm run typecheck
npm run build
```

The first two ran successfully in the delivery environment: 29 domain/provider-mock tests passed; pure domain/UI modules passed strict TypeScript checking; all 25 TypeScript/TSX modules passed syntax checking. A separate Chromium pass completed 34 UI checks, including mobile 390px and 320px layouts, with no JavaScript errors or network requests. Screenshots and the browser report are under `dist/qa/`.

The last two commands require the actual installed dependencies and Convex-generated bindings and **were not successfully run here**. Live authorization, research, scheduled job behavior and production deployment must be tested against your accounts before the beta opens. `docs/TESTING.md` separates completed verification from that remaining launch work.

## Official integration references

API behavior and deployment configuration were checked against these primary references on September 12, 2026. Recheck when changing SDKs or models.

- OpenAI web search: https://developers.openai.com/api/docs/guides/tools-web-search
- OpenAI deep research and background retention: https://developers.openai.com/api/docs/guides/deep-research
- Clerk with Convex: https://docs.convex.dev/auth/clerk
- Convex on Vercel: https://docs.convex.dev/production/hosting/vercel
- Next.js proxy convention: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
