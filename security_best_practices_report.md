# BeforeBuild security audit

Date: 2026-09-15

## Executive summary

No critical or high-risk vulnerability was confirmed. Two medium findings block production: deleting an idea does not delete its linked diagnostic records, and one tester can consume the whole shared Gemini allowance by using several ideas. A third medium hardening gap, the lack of a Content Security Policy (CSP), should be tested after deployment because Clerk and Convex require exact allowed connection domains.

## Medium findings

### SEC-01 — Idea deletion leaves linked diagnostic data

- Location: `convex/ideas.ts:99`, `convex/ideas.ts:44`, `convex/jobs.ts:35`, `convex/jobs.ts:83`, `lib/ui.ts:145`, `lib/ui.ts:224`.
- Evidence: idea deletion removes the idea and its per-idea usage, while rejected inputs and provider errors store an `ideaId` and are not removed.
- Impact: rejected text or diagnostic details can remain after the user is told the saved conversation was deleted.
- Owner decision: retain rejected-input and provider-error audit records when an idea is deleted. Do not add linked deletion or automatic expiry without new owner approval.
- Mitigation: only administrators can read these tables, but that does not correct the deletion promise.
- Production decision: the owner accepts this retention behavior and explicitly chose not to change the current deletion wording. It is not a deployment blocker.

### SEC-02 — One tester can consume the shared AI allowance

- Location: `convex/guards.ts:58`, `convex/jobs.ts:14`, `convex/ideas.ts:33`, `convex/guards.ts:35`.
- Evidence: limits exist per idea and for the whole environment, but not per tester across ideas.
- Impact: one allowed or compromised account can exhaust all 250 production requests and stop AI access for every other tester.
- Possible option: atomically enforce a per-tester Gemini limit before incrementing the shared counter. The owner has explicitly decided not to implement a daily tester limit now. Agents must not choose or add one without the owner's specific approval.
- Mitigation: the five-message burst limit slows exhaustion but does not prevent it.
- Production decision: reserved for the owner; this report records the availability risk but does not choose the policy.

### SEC-03 — Content Security Policy is absent

- Location: `next.config.ts:5`, `lib/ui.ts:154`.
- Evidence: the app sets `nosniff`, frame denial, referrer, and permissions headers, but no CSP. The UI uses escaped string templates rendered through `innerHTML`.
- Impact: a future missed escaping bug would have fewer browser-level limits.
- Fix: add and test a header-based CSP with exact Clerk and Convex domains. Do not add broad `unsafe-eval` or guess production domains.
- Mitigation: traced user and AI text is HTML-escaped, external links accept only HTTP/HTTPS without embedded credentials, and framing is denied.
- Production blocker: no by itself; verify after deployment.

## Checks that passed

- Public idea operations require a verified Clerk identity and server-side ownership.
- Admin data and changes require server-side administrator access.
- AI output has strict type, length, count, value, and canvas-section checks.
- Provider credentials remain server-side and stored errors redact keys and bearer tokens.
- No confirmed unsafe redirect, arbitrary server fetch, command execution, browser token storage, or unescaped user-to-HTML path was found.
- `npm audit --omit=dev` reported zero known vulnerabilities across 144 installed packages.

## Required production runtime checks

- Signed-out and non-admin access remains denied.
- One user cannot access another user's idea by ID.
- Production uses production Clerk, Convex, and Gemini settings; demo mode is false.
- The AI kill switch works.
- A future CSP permits required Clerk and Convex traffic while blocking unexpected scripts and framing.
