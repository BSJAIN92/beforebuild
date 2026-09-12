# Verification and remaining launch work

## Executed for this delivery

| Check | Result | Scope |
| --- | --- | --- |
| Strict TypeScript compile (`tsconfig.core.json`) | Passed | All pure domain and UI files under `lib/` |
| TypeScript/TSX syntax check | Passed, 25 modules | Parses/transpiles framework and backend source; not a dependency-aware application typecheck |
| Domain and provider tests | Passed, 29 tests | Core model, safe merge, scripted flows, mocked persistence and mocked HTTP |
| Chromium browser checks | Passed, 34 checks | Standalone HTML UI using test Storage fixture |
| Mobile workspace layout | Passed at 390px and 320px | No body overflow; intentional horizontal canvas scrolling stays inside its container |
| JavaScript browser errors | None | Executed standalone test paths |
| Network requests from standalone demo | None | Executed standalone test paths |

Run the reproducible tests with:

```sh
npm test
npm run demo:build
```

Optional browser checks use Python Playwright and Chromium:

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/browser_smoke.py
```

To use an existing browser executable, set `BROWSER_EXECUTABLE=/path/to/chromium`. Screenshots, export fixtures and `browser-results.json` are written to `dist/qa/`. The runner loads HTML through `page.set_content`; it does not pretend to test a deployed server. Storage in the browser runner is an injected in-memory fixture. The separate persistence tests also use a fake Storage API, not actual cross-session disk storage.

Tests cover all three tier budgets, nine-block finalization, uncertain answers, explicit early completion, rejection of premature AI completion, missing output sections, duplicate entries, evidence/source validation, manual edit and name protection, founder decision preservation, completed experiments, safe HTML and links, same-record upgrades, cancellation of a delayed demo turn, input bounds, research consent, allowlist controls, disabled billing and portable exports.

Provider tests assert the actual constructed request shapes against a mocked `fetch`: no interview tools, strict structured output, native web/deep tools, background requests, configurable models, safe response identifiers, annotation-derived source links and sanitized failure messages. They do not prove a live provider accepts the requests or that research claims are accurate.

## Not executed here

The delivery environment could not install npm dependencies from the registry and had no live service credentials. Consequently the dependency-aware full application typecheck, `next build`, Clerk login, deployed Convex mutations/scheduled jobs, real research quality, provider permissions, external API latency, production access isolation and Vercel hosting have not been verified. No hosted beta URL was created.

Do not use the successful core/syntax tests as a substitute for these checks.

## Required connected checks before inviting testers

**Build and auth.** Resolve dependencies and commit the lockfile; regenerate Convex API bindings; run `npm run typecheck` and `npm run build`. Verify a logged-out visitor cannot read ideas. A verified but unlisted email must be denied. An unverified email must remain denied, even when listed. A permitted email must gain access only after the backend validates its token.

**Isolation.** Use two genuine accounts. Create different ideas and attempt to call every read/write operation against the other account’s ID. Each must fail without revealing its contents. A normal account must be unable to list/revoke invites or change pricing. Admin privilege must not bypass idea ownership.

**Revocation.** Revoke an allowed account while it has an open page and research in progress. Future application operations must fail; the worker must stop at its next stage. Test the environment-allowlist/database-revocation precedence. Previously loaded data may still exist in an already-open browser; revocation is not remote erasure.

**Research.** Check Basic has zero web calls. Verify Intermediate/Advanced actually invoke the configured native research tool and return cited results. Open the reported sources and assess support, recency, geography and counterevidence. A missing citation result must fail closed. Confirm private provider response IDs do not appear in the browser snapshot.

**Resilience.** Simulate permission failures, 429s, incomplete model output, malformed JSON, absent citations and request timeouts. Answers must remain saved. Test cancel/delete during research and ensure stale callbacks never recreate or overwrite an idea. Close/reopen the browser during a research job. Check watchdog recovery and duplicate action protection on the deployed scheduler.

**Economics and limits.** Lower daily limits to small test values, make concurrent calls, and verify the transactional counters reject excess usage. Validate provider-side spending controls independently. Check a large idea fails with a useful size message rather than silently dropping data. Retry billing and retention behavior needs real provider observation.

**Usability.** Test current Safari/Firefox/Chromium, actual browser persistence, keyboard and screen-reader interaction, long research citations, long edited canvas points, mobile on-screen keyboard behavior and print-to-PDF pagination. Automated browser coverage is not a complete accessibility audit.

**Billing guard.** Beta prices may change without payment prompts. Keep `BILLING_ENABLED=false`. No card form, checkout session, transaction or payment entitlement should exist until you intentionally implement and test it.
