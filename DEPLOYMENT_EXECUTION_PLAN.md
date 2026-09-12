# BeforeBuild Deployment Execution Plan

## Purpose

Deploy BeforeBuild as an invite-only private beta using a public GitHub source repository, Vercel, Convex, Clerk, and OpenAI.

The product source is located at:

```text
beforebuild-source/beforebuild
```

Treat that directory as the application and Git repository root.

The copy of this file inside that repository root is authoritative. A workspace-level copy was retained as a safety backup when this file was first added to Git, but agents must read and update the repository copy from Step 3 onward.

The GitHub repository is intentionally **public** by user decision. Anyone can read, copy, and inspect committed source and history. Never commit credentials, private user data, real idea content, or operational secrets. Private-beta access refers to the running application, which must still enforce verified-email allowlisting.

## Agent persona

Act as a careful deployment engineer for a private SaaS beta. Protect user data and credentials, keep development and production separate, verify every result, and report failures honestly.

## Mandatory execution protocol

These rules apply to every agent using this file.

1. At the start of every session, read this entire file and inspect the **Progress ledger**.
2. Verify the recorded state against the repository before trusting it. For example, check Git status, expected files, and the last recorded evidence.
3. Continue from the first step whose status is not `COMPLETE`. Do not repeat completed work unless verification shows that its result is missing or broken.
4. Before doing **each numbered step**, explain the exact action, its expected result, and any risk in plain language.
5. Ask the user for approval for that one step. Do not combine approvals for several steps.
6. Do not execute the step until the user explicitly approves it.
7. After executing the approved step, verify its acceptance check.
8. Immediately update this file before asking approval for the next step. Record the status, date, evidence, files changed, commands run, and any blocker.
9. Commit the updated progress file with the related code change when a commit is part of the approved step. Otherwise, leave it saved in the working tree.
10. Never record secret values in this file, terminal output committed to Git, issue trackers, or chat. Record only whether a secret was configured and where.
11. If a command fails, mark the step `BLOCKED` or `IN PROGRESS`, save the failure summary, and ask the user before trying a materially different action.
12. Never mark a step `COMPLETE` until its acceptance check passes.

### Allowed status values

- `NOT STARTED`
- `AWAITING APPROVAL`
- `IN PROGRESS`
- `BLOCKED`
- `COMPLETE`

### Progress update format

Use this format in the relevant ledger row or its notes:

```text
Status:
Updated:
Agent/session:
Approval received:
Actions performed:
Commands run:
Files changed:
Verification evidence:
Blocker or next action:
```

## Important findings from the initial review

- The source is not currently inside a Git repository.
- There is no `package-lock.json`.
- Dependencies are not installed.
- Checked-in Convex generated files are bootstrap placeholders and must be regenerated against a real project.
- The complete Next.js build has not passed yet.
- Live Clerk, Convex, OpenAI, and Vercel integration has not been tested.
- On Windows, `npm test` currently fails when local TypeScript is absent because `scripts/test.mjs` tries to launch `npm` instead of `npm.cmd`.
- Billing is not implemented. `BILLING_ENABLED` must remain `false`.
- Connected mode requires Clerk and OpenAI in addition to GitHub, Vercel, and Convex.
- Production Clerk authentication requires a custom domain; do not plan to launch only on a generic `*.vercel.app` address.

## Required user-controlled inputs

Agents must request only the input needed for the next approved step. Do not ask for all secrets at once.

- GitHub repository destination, visibility decision, and account access
- Convex development and production project access
- Clerk development and production application access
- OpenAI development and production API project access
- Vercel project and team access
- Final custom domain and DNS access
- Verified owner/admin email
- Initial tester email
- Spending limits acceptable to the user

Secret values must be entered directly into the correct service dashboard or secure environment configuration. They must not be committed.

## Progress ledger

Update this table immediately after every approved step.

| Step | Description | Status | Last updated | Evidence / next action |
| --- | --- | --- | --- | --- |
| 0 | Resume check and baseline confirmation | COMPLETE | 2026-09-12 | Baseline verified. Application directory exists; Git is not initialized; `package-lock.json` and `node_modules` are absent. Node.js is v24.19.0 and satisfies the declared `>=22.0.0` requirement. The user directed agents not to switch it for Step 4. Next action: request approval for Step 1. |
| 1 | Confirm repository root and deployment scope | COMPLETE | 2026-09-12 | Confirmed `beforebuild-source/beforebuild` as the future repository root and the target as the connected, invite-only private beta. Next action: request separate approval for Step 2. |
| 2 | Initialize local Git repository | COMPLETE | 2026-09-12 | Secret scan found no likely real credential; environment-file ignore coverage was tightened; Git was initialized on empty `main`; 46 intended files are untracked and no commit exists. Next action: request separate approval and GitHub destination for Step 3. |
| 3 | Create and connect public GitHub repository | COMPLETE | 2026-09-12 | Public `BSJAIN92/beforebuild` exists; `main` is the default branch and tracks `origin/main`; expected root layout and history scan verified. Next action: request separate approval for Step 4. |
| 4 | Install dependencies and create lockfile | COMPLETE | 2026-09-12 | `npm install` and a clean `npm ci` succeeded on Node.js v24.19.0; lockfile v3 created; audit found 0 vulnerabilities. Clerk post-install script remained blocked pending review. Next action: request separate approval for Step 5. |
| 5 | Fix and run the local automated checks | COMPLETE | 2026-09-12 | All 29 tests, standalone demo build, full type check, and Next.js production build passed on Node.js v24.19.0. No product-code fix was needed. Next action: request separate approval and access for Step 6. |
| 6 | Create and configure Convex development deployment | IN PROGRESS | 2026-09-12 | Hosted project `beforebuild` was created in US East. Setup paused before linkage/sync at Convex's optional AI-guidance-files prompt. Awaiting user choice: add those files or skip them. |
| 7 | Configure Clerk development authentication | NOT STARTED | — | Await Step 6 and user access. |
| 8 | Verify the connected application locally | NOT STARTED | — | Await Step 7. |
| 9 | Run live access, ownership, resilience, and AI checks | NOT STARTED | — | Await Step 8. |
| 10 | Create isolated production services | NOT STARTED | — | Await Step 9 and user approval of production settings. |
| 11 | Configure the custom domain and production Clerk | NOT STARTED | — | Await Step 10 and DNS access. |
| 12 | Import GitHub repository into Vercel | NOT STARTED | — | Await Step 11. |
| 13 | Configure Vercel and Convex production deployment | NOT STARTED | — | Await Step 12. |
| 14 | Deploy and verify a hosted preview | NOT STARTED | — | Await Step 13. |
| 15 | Deploy and verify production | NOT STARTED | — | Await Step 14 and explicit production approval. |
| 16 | Configure monitoring, limits, rollback, and beta operations | NOT STARTED | — | Await Step 15. |
| 17 | Final handoff and release record | NOT STARTED | — | Await Step 16. |

## Step-by-step execution

### Step 0 — Resume check and baseline confirmation

Progress record:

```text
Status: COMPLETE
Updated: 2026-09-12
Agent/session: /root/deployment_step_0
Approval received: Yes — the user asked a subagent to start the first milestone, and the parent agent limited that approval to Step 0.
Actions performed: Read this execution plan in full; inspected the application directory, Git state, lockfile, dependency directory, and installed Node.js/npm versions; compared the results with the ledger.
Commands run: Get-Content -LiteralPath 'DEPLOYMENT_EXECUTION_PLAN.md' -Raw (from the workspace root); Get-Location; Get-ChildItem -Force; git status --short --branch; Test-Path -LiteralPath 'package-lock.json'; Test-Path -LiteralPath 'node_modules'; node --version; npm --version (baseline commands run from beforebuild-source/beforebuild).
Files changed: DEPLOYMENT_EXECUTION_PLAN.md only, to save this progress record. No product files or external services were changed.
Verification evidence: The application path is D:\One Drive\OneDrive\Self Docs\Bhavya\Startup\BMC\GPT 6 Web Source\beforebuild-source\beforebuild. Expected application items including package.json, app, components, convex, and lib exist. Git reported "not a git repository". Both package-lock.json and node_modules returned False. Node.js reported v24.19.0 and npm reported 12.0.2. The prior ledger accurately stated that Git, the lockfile, and dependencies were absent. The additional Node.js version mismatch is now recorded.
Blocker or next action: No Step 0 blocker. Step 1 is next and requires separate user approval. Step 1 must confirm the proposed repository root and connected invite-only beta scope. Node.js v24.19.0 satisfies the package's `>=22.0.0` requirement and must not be switched for Step 4, per the user's later direction.
```

Before acting, inspect:

```powershell
Get-Location
Get-ChildItem -Force
git status --short --branch
Test-Path package-lock.json
Test-Path node_modules
node --version
npm --version
```

If Git is not initialized, record that rather than treating the Git command failure as a product failure. Compare the results with the progress ledger and continue from the first incomplete step.

Acceptance check:

- The agent has identified the real current state.
- Any mismatch with the ledger has been recorded.
- No files or external services were changed during this check.

### Step 1 — Confirm repository root and deployment scope

Progress record:

```text
Status: COMPLETE
Updated: 2026-09-12
Agent/session: /root/deployment_step_0
Approval received: Yes — the user explicitly approved Step 1 only.
Actions performed: Read this execution plan in full and confirmed Step 0 was COMPLETE; inspected the proposed repository root's top-level layout; verified the required application files and directories exist; checked the workspace and application READMEs for the intended connected mode, allowlisted access, and private-beta language.
Commands run: Get-Content -LiteralPath 'DEPLOYMENT_EXECUTION_PLAN.md' -Raw; Get-ChildItem -LiteralPath 'beforebuild-source\beforebuild' -Force | Select-Object Name, PSIsContainer; Test-Path checks for package.json, app, components, convex, and lib; rg -n --ignore-case "connected|demo mode|invite|allowlist|private beta" against the workspace and application README files.
Files changed: DEPLOYMENT_EXECUTION_PLAN.md only, to save this progress record. Git was not initialized and no product files or external services were changed.
Verification evidence: `beforebuild-source/beforebuild` directly contains package.json, app, components, convex, lib, configuration files, scripts, and tests, so it is the correct application and future repository root. The READMEs distinguish the standalone scripted demo from connected mode and document verified-email allowlisting, real users, storage, AI, and invited testers. This matches the user's requested deployment through GitHub, Vercel, and Convex and the plan's connected invite-only private-beta target.
Blocker or next action: No Step 1 blocker. Step 2 is next and requires separate user approval. Step 2 may inspect and update ignore rules, scan for likely secrets, initialize Git in the confirmed application root, and report the proposed first-commit file list; it must not commit yet.
```

Confirm with the user that `beforebuild-source/beforebuild` will become the repository root and that the target is a connected, invite-only beta rather than the standalone demo.

Acceptance check:

- Repository root and private-beta scope are recorded in the progress ledger.

### Step 2 — Initialize the local Git repository

Progress record:

```text
Status: COMPLETE
Updated: 2026-09-12
Agent/session: /root/deployment_step_0
Approval received: Yes — the user explicitly approved Step 2 only.
Actions performed: Read this execution plan in full and verified Steps 0 and 1 were COMPLETE; inspected .gitignore; searched filenames and file contents for likely private keys and provider credentials while printing only paths, variable names, and classifications; confirmed apparent matches were blank/comment examples, a three-character placeholder, README examples, or test data; expanded environment-file ignore coverage while preserving .env.example; initialized Git with main as the initial branch; reviewed all 46 proposed first-commit files.
Commands run: Get-Content of this plan and .gitignore; Get-ChildItem filename scan for environment/key/credential files; rg path-only scans for private-key blocks, credential-shaped tokens, and sensitive variable assignments; metadata-only PowerShell classifiers; git init -b main; git status --short --branch --untracked-files=all; git check-ignore -v against secret/generated examples; git ls-files --others --exclude-standard checks for .env.example and ignored environment files. Two metadata classifier attempts had PowerShell parsing errors and changed nothing; corrected commands succeeded. One check-ignore interpretation message incorrectly called the negated .env.example rule an error; git status and git ls-files directly confirmed the file is trackable.
Files changed: beforebuild-source/beforebuild/.gitignore; beforebuild-source/beforebuild/.git/ metadata created by Git initialization; DEPLOYMENT_EXECUTION_PLAN.md updated with this record. No commit, remote, GitHub repository, dependency, product-code file, or external service was created or changed.
Verification evidence: Git reports "No commits yet on main" from the confirmed application root. .env, .env.local, .env.production, .env.development.local, node_modules, .next, .vercel, .test-build, dist, and *.tsbuildinfo examples are ignored. .env.example remains visible as an intended untracked file. The secret scan found no likely real secret or private-key block. git status exposes only the 46 intended files listed below. The .gitignore change replaced narrow environment patterns with .env* plus !.env.example so production-style local environment files cannot be committed accidentally.
Blocker or next action: No Step 2 blocker. Step 3 is next and requires separate user approval plus the GitHub account or organization and desired repository name. Do not commit, add a remote, create GitHub resources, or push until that approval and destination are supplied.
```

Proposed first-commit file list (46 files; no commit has been created):

```text
.env.example
.gitignore
README.md
app/error.tsx
app/globals.css
app/layout.tsx
app/page.tsx
components/ClientRoot.tsx
components/Providers.tsx
components/Workspace.tsx
components/live-backend.ts
convex.json
convex/_generated/api.d.ts
convex/_generated/api.js
convex/_generated/dataModel.d.ts
convex/_generated/server.d.ts
convex/_generated/server.js
convex/access.ts
convex/auth.config.ts
convex/guards.ts
convex/ideas.ts
convex/jobs.ts
convex/providers.ts
convex/runner.ts
convex/schema.ts
convex/settings.ts
docs/DEPLOYMENT.md
docs/TESTING.md
lib/ai-contract.ts
lib/backend.ts
lib/demo.ts
lib/export.ts
lib/icons.ts
lib/model.ts
lib/ui.ts
next-env.d.ts
next.config.ts
package.json
proxy.ts
scripts/build-demo.mjs
scripts/test.mjs
tests/browser_smoke.py
tests/core.test.cjs
tests/provider.test.cjs
tsconfig.core.json
tsconfig.json
```

Actions:

1. Inspect `.gitignore` and add any missing generated or secret paths.
2. Search the working tree for likely secrets.
3. Initialize Git in the application root.
4. Review the exact files that would be included in the first commit.
5. Do not commit until the user approves the proposed file list.

Acceptance check:

- Git is initialized in the correct directory.
- Secret and generated files are ignored.
- `git status` contains only intended source and documentation files.

### Step 3 — Create and connect the public GitHub repository

Progress record:

```text
Status: COMPLETE
Updated: 2026-09-12
Agent/session: /root/deployment_step_0
Approval received: Yes — the user explicitly approved Step 3, selected repository name beforebuild under BSJAIN92, accepted the proposed file list, and changed GitHub visibility to PUBLIC.
Actions performed: Read the current execution plan and verified Steps 0–2 were COMPLETE; confirmed GitHub CLI authentication for BSJAIN92 using SSH; confirmed BSJAIN92/beforebuild did not already exist; repeated path-only and metadata-only secret checks with zero suspected real credentials; reviewed the intended files; copied this plan into the application repository root without deleting the workspace backup; designated this repository copy authoritative; recorded the public-source disclosure risk; committed all 47 reviewed files; created PUBLIC GitHub repository BSJAIN92/beforebuild; configured SSH origin; pushed main; verified repository metadata, root layout, branch tracking, and committed history.
Commands run: Get-Content of the workspace plan; gh auth status; gh repo view BSJAIN92/beforebuild with safe metadata fields before and after creation; git status --short --branch --untracked-files=all; Get-ChildItem filename scan; rg path-only credential pattern scan; metadata-only PowerShell secret classifier; Copy-Item of the plan into the repository root; Get-FileHash to verify the source and copied plan initially matched; git ls-files --others --exclude-standard; git add --all; git diff --cached --name-status; git commit; gh repo create BSJAIN92/beforebuild --public --source=. --remote=origin --push; gh api repository-root metadata query; git remote -v; git branch -vv; git ls-tree --name-only HEAD; path-only git grep over all commits for credential-shaped tokens and private-key blocks; git status --short --branch. The first repository-plan patch failed only because its heading context differed and changed nothing; smaller corrected edits succeeded.
Files changed: beforebuild-source/beforebuild/DEPLOYMENT_EXECUTION_PLAN.md was added and made authoritative; all 46 previously reviewed application/source files entered Git in the initial commit. The workspace-root DEPLOYMENT_EXECUTION_PLAN.md remains preserved as a safety backup and was not deleted. No dependency files, service credentials, or product behavior were changed.
Verification evidence: Initial commit 4814dd3 contains 47 files and was pushed. GitHub reports nameWithOwner BSJAIN92/beforebuild, visibility PUBLIC, default branch main, and SSH URL git@github.com:BSJAIN92/beforebuild.git. The remote root directly contains package.json, app, components, convex, lib, README.md, and this plan. Local main tracks origin/main. Repeat working-tree classification reported SuspectedRealCount=0, and the path-only scan of every Git commit found no credential-shaped token or private-key block. The public repository URL is https://github.com/BSJAIN92/beforebuild. Public-source risk is explicit: anyone may read or copy committed code, while running-product access must remain restricted by verified-email allowlisting.
Blocker or next action: No Step 3 blocker. Step 4 is next and requires separate user approval. Keep the currently installed Node.js v24.19.0; it satisfies the declared `>=22.0.0` requirement, and the user explicitly directed agents not to switch it. Do not begin Step 4 without approval.
```

Actions:

1. Ask the user for the GitHub account or organization and repository name.
2. Create the repository with the user-approved visibility (**public** for `BSJAIN92/beforebuild`).
3. Add it as the Git remote.
4. Create the initial commit and push `main` only after approval.
5. Verify the GitHub file layout and repository visibility.

Acceptance check:

- GitHub repository exists with the user-approved visibility.
- `main` is pushed.
- The repository opens directly at `package.json`, `app`, `components`, `convex`, and `lib`.
- No secret is present in the repository or its history.

### Step 4 — Install dependencies and create the lockfile

Progress record:

```text
Status: COMPLETE
Updated: 2026-09-12
Agent/session: /root/deployment_step_0
Approval received: Yes — the user explicitly approved Step 4 only and directed agents to keep Node.js v24.19.0.
Actions performed: Read the authoritative repository plan and verified Steps 0–3 were COMPLETE; confirmed local HEAD matched origin/main; reviewed the existing uncommitted plan-only Node.js decision and preserved it; confirmed package.json and its declared Node.js >=22.0.0 engine; ran npm install; reviewed direct resolved versions and the machine-readable audit summary; reviewed npm's blocked-install-script report; verified package.json was unchanged by hash; ran npm ci, which safely replaced only ignored generated node_modules; verified the resulting dependency tree and lockfile metadata.
Commands run: Get-Content DEPLOYMENT_EXECUTION_PLAN.md; git status --short --branch; git rev-parse HEAD and origin/main; Test-Path for package.json, package-lock.json, and node_modules; node --version; npm --version; Get-FileHash package.json; Get-Content package.json; git diff checks; npm install; npm ls --depth=0; npm audit --json; npm install-scripts ls; npm ci; metadata-only Node.js inspection of package-lock.json; git check-ignore -v node_modules.
Files changed: package-lock.json was created. DEPLOYMENT_EXECUTION_PLAN.md contains the previously approved Node.js v24.19.0 decision and this Step 4 record. package.json and product code were not changed. node_modules was generated, then safely replaced by npm ci, and remains ignored by Git.
Verification evidence: npm install added 48 packages and completed successfully. npm ci independently added 48 packages from the lockfile and completed successfully. package-lock.json exists, uses lockfileVersion 3, records 107 package entries (106 dependency entries with integrity metadata), and preserves the root Node.js engine >=22.0.0. Direct resolved versions are @clerk/nextjs 6.39.6, convex 1.45.0, next 16.3.5, react 19.3.0, react-dom 19.3.0, typescript 5.9.3, @types/node 22.20.2, @types/react 19.3.0, and @types/react-dom 19.3.0. npm audit reported 0 info, low, moderate, high, or critical vulnerabilities. The package.json SHA-256 hash remained unchanged. node_modules is ignored.
Blocker or next action: No Step 4 blocker. npm 12 blocked @clerk/shared 3.47.8's postinstall script because no allowScripts decision is recorded. Do not approve it automatically. Proposed response: keep it blocked for now, run Step 5 checks, and before live Clerk testing review the package's documented need for that script; approve or deny it only through a separate user-approved change if testing or official guidance shows a need. Step 5 is next and requires separate user approval. Do not run or fix tests under Step 4.
```

Actions:

1. Keep the installed Node.js v24.19.0 for local dependency work. It satisfies the package's declared `>=22.0.0` requirement, and the user explicitly directed agents not to switch it.
2. Run `npm install`.
3. Review resolved dependency versions and `npm audit` output.
4. Save and review `package-lock.json`.
5. Do not make broad dependency upgrades without separate approval.

Acceptance check:

- Dependencies install successfully.
- `package-lock.json` exists.
- Audit findings are recorded with a proposed response.
- A clean install can use `npm ci`.

### Step 5 — Fix and run local automated checks

Progress record:

```text
Status: COMPLETE
Updated: 2026-09-12
Agent/session: /root/deployment_step_0
Approval received: Yes — the user explicitly approved Step 5's diagnostic checks and any fix was to require a separate approval if a check failed.
Actions performed: Read the authoritative plan and verified Step 4 was COMPLETE; confirmed Node.js v24.19.0 and npm 12.0.2 remained active; confirmed @clerk/shared's postinstall script remained blocked; ran npm test, npm run demo:build, npm run typecheck, and npm run build in that order; inspected generated/ignored artifacts and the tracked Next.js-generated next-env.d.ts update; made no code, configuration, test, or type-check weakening changes.
Commands run: Get-Content DEPLOYMENT_EXECUTION_PLAN.md; git status --short --branch; node --version; npm --version; npm install-scripts ls; npm test; npm run demo:build; npm run typecheck; npm run build; git check-ignore checks for dist, .next, and *.tsbuildinfo; git diff -- next-env.d.ts.
Files changed: dist/beforebuild-demo.html and .next build output were regenerated and remain ignored. next-env.d.ts was regenerated by Next.js to include its current generated route/root parameter type references and standard do-not-edit notice; no hand edit was made. DEPLOYMENT_EXECUTION_PLAN.md was updated with this record. No product logic, test, package, dependency, or environment file changed.
Verification evidence: npm test passed 29 of 29 tests with 0 failures, skips, or cancellations; provider tests used mocked HTTP and contacted no AI service. npm run demo:build created the 134 KB standalone demo with no external requests. npm run typecheck exited successfully with no errors. npm run build using Next.js 16.3.5 compiled successfully, completed its TypeScript phase, generated 3 of 3 static pages, and reported static routes / and /_not-found plus middleware. dist, .next, and *.tsbuildinfo are ignored. @clerk/shared 3.47.8's postinstall remains blocked and was not approved or run.
Blocker or next action: No Step 5 blocker and no fix is required. Step 6 is next and requires separate user approval plus Convex development project access. Do not begin Convex setup under Step 5.
```

Actions:

1. Re-run `npm test` after local dependencies exist.
2. If the Windows fallback still fails, update `scripts/test.mjs` to use the correct npm executable on Windows, or remove the global fallback if local TypeScript makes it unnecessary.
3. Run:

```sh
npm test
npm run demo:build
npm run typecheck
```

4. Fix actual code or type errors one at a time, with approval before each materially separate fix.
5. Commit the lockfile and approved fixes.

Acceptance check:

- Tests pass.
- Demo build passes.
- Type checking passes as far as possible before live Convex generation.
- Results and any remaining expected Convex error are recorded.

### Step 6 — Create and configure Convex development deployment

Progress record:

```text
Status: IN PROGRESS
Updated: 2026-09-12
Agent/session: /root/deployment_step_0
Approval received: Yes — the user approved Step 6, confirmed no existing Convex project, and approved creating a new project named beforebuild. No approval was given for Convex's subsequently presented cloud-versus-local deployment choice.
Actions performed: Read the authoritative plan and verified Step 5 was COMPLETE; confirmed the Git working tree initially matched origin/main; inspected the current Convex CLI help; started one-time new-project configuration; accepted only the explicitly approved project name beforebuild; stopped safely at the required choice between a cloud deployment and local deployment beta; verified no local Convex configuration or environment file was created.
Commands run: Get-Content DEPLOYMENT_EXECUTION_PLAN.md; git status --short --branch; npx convex dev --help; npx convex dev --configure new --once in an interactive terminal; accepted project name beforebuild; sent Ctrl+C at the cloud/local choice; Get-ChildItem metadata-only check for .env*/.convex* paths; Test-Path for .env.local and .convex.
Files changed: DEPLOYMENT_EXECUTION_PLAN.md only, to save this progress. No Convex-generated bindings, product code, package files, environment files, or secret-bearing files changed. No external Convex project/deployment was created before cancellation.
Verification evidence: Convex CLI offered project name beforebuild and then required choosing either "cloud deployment" or "local deployment (BETA)." The choice was not made. After cancellation, Git was clean, .env.local did not exist, .convex did not exist, and only the tracked .env.example matched the environment-file check. Code generation, schema sync, functions, deployment identity, and safe environment limits therefore remain pending. The Clerk postinstall script was not approved or run.
Blocker or next action: One user decision is required: approve "cloud deployment" (recommended because the target is Vercel and a hosted Convex backend) or choose the local deployment beta. After that approval, resume Step 6, handle any login/team prompt without guessing, create/link beforebuild, perform one-time codegen/sync, and set only AI_MAX_DAILY_TURNS=20, AI_MAX_DAILY_RESEARCH=1, AI_MAX_IDEAS=10, and BILLING_ENABLED=false. Keep CLERK_JWT_ISSUER_DOMAIN, ADMIN_EMAILS, BETA_ALLOWLIST, OPENAI_API_KEY, provider/model settings, and Step 7 pending.
```

Resume update after cloud approval:

```text
Status: IN PROGRESS
Updated: 2026-09-12
Agent/session: /root/deployment_step_0
Approval received: Yes — the user explicitly approved the cloud deployment choice for the existing Step 6. No data-region choice was approved.
Actions performed: Re-read the authoritative plan; resumed the supported one-time new-project flow; accepted the already approved project name beforebuild; selected the newly approved cloud deployment option; stopped safely when Convex required a choice of data region; verified no local Convex deployment configuration or environment file was created; confirmed the Clerk postinstall script remains blocked.
Commands run: Get-Content DEPLOYMENT_EXECUTION_PLAN.md; npx convex dev --configure new --once in an interactive terminal; accepted beforebuild; selected cloud deployment; sent Ctrl+C at the data-region prompt; git status --short --branch; Test-Path for .env.local and .convex; metadata-only Get-ChildItem check for .env*/.convex* paths; npm install-scripts ls.
Files changed: DEPLOYMENT_EXECUTION_PLAN.md only, to save this resumed progress. No generated bindings, schema files, product code, package files, or secret-bearing files changed. No local Convex configuration was created, and project creation had not completed before cancellation.
Verification evidence: After selecting cloud, Convex required "Where should this dev deployment run?" with choices "US East (N. Virginia)" and "Europe (Ireland)." The process was cancelled without choosing. .env.local and .convex remain absent; the only environment-named file is tracked .env.example. Codegen, schema/function sync, safe development settings, and deployment verification remain pending. @clerk/shared 3.47.8's postinstall remains blocked.
Blocker or next action: One user decision is required: choose US East (N. Virginia) or Europe (Ireland). The choice controls where Convex stores/processes development data and affects latency. After approval, resume Step 6 and stop again rather than guessing if login, team selection, or another material choice appears. Do not begin Step 7.
```

Resume update after US East approval:

```text
Status: IN PROGRESS
Updated: 2026-09-12
Agent/session: /root/deployment_step_0
Approval received: Yes — the user selected US East (N. Virginia) for the cloud development deployment. No choice was given for Convex's later optional AI guidance files.
Actions performed: Re-read the authoritative plan; resumed one-time new-project setup; selected the approved project name beforebuild, cloud deployment, and US East region; allowed Convex to create the hosted project; stopped safely when Convex asked whether to add AI guidelines, AGENTS.md, and agent skills; inspected local paths without printing environment values; reviewed the safe generated convex/tsconfig.json; added .convex/ to .gitignore as protection for any future local-only Convex metadata; confirmed Clerk's postinstall remains blocked.
Commands run: Chunked Get-Content reads of DEPLOYMENT_EXECUTION_PLAN.md; npx convex dev --configure new --once in an interactive terminal; accepted beforebuild, cloud, and US East; sent Ctrl+C at the AI-files prompt; git status --short --branch; metadata-only Get-ChildItem checks; Test-Path for .env.local and .convex; Get-Content convex/tsconfig.json; git check-ignore for local Convex/environment paths; npm install-scripts ls.
Files changed: Convex generated safe tracked config convex/tsconfig.json. .gitignore now ignores .convex/ local metadata in addition to .env.local through the existing .env* rule. DEPLOYMENT_EXECUTION_PLAN.md records progress. No generated API bindings changed yet; no environment or secret-bearing file was created.
Verification evidence: Convex reported "Created project beforebuild" and provided the non-secret management URL https://dashboard.convex.dev/t/bhavya-jain-76d30/beforebuild. It then asked "Set up Convex AI files? (guidelines, AGENTS.md, agent skills)" and was cancelled without an answer. Git showed only untracked convex/tsconfig.json before this record. .env.local and .convex remained absent. Existing convex/_generated files retained their prior timestamps/sizes, so codegen and sync have not completed. @clerk/shared 3.47.8's postinstall remains blocked.
Blocker or next action: One user choice is required: add Convex's optional AI guidance files or skip them. Recommended: skip them because deployment does not require them and this repository already has an authoritative execution plan; this avoids unrelated generated instructions. After approval, resume by linking to the existing hosted project rather than attempting to create it again, then run one-time codegen/sync and configure only the four approved safe limits. Do not begin Step 7.
```

Actions:

1. Create or select a Convex project and development deployment.
2. Run `npx convex dev`.
3. Regenerate `convex/_generated` against the real project.
4. Configure development Convex environment variables without exposing their values:

```dotenv
CLERK_JWT_ISSUER_DOMAIN=<development Clerk issuer>
ADMIN_EMAILS=<verified owner email>
BETA_ALLOWLIST=<development tester emails>
OPENAI_API_KEY=<development key>
AI_PROVIDER=openai
AI_INTERVIEW_MODEL=<confirmed available model>
AI_RESEARCH_MODEL=<confirmed available web-search model>
AI_DEEP_RESEARCH_MODEL=<confirmed available deep-research model>
AI_DEEP_SEARCH_TOOL=<confirmed supported tool>
AI_MAX_DAILY_TURNS=20
AI_MAX_DAILY_RESEARCH=1
AI_MAX_IDEAS=10
BILLING_ENABLED=false
```

If Clerk is not yet created, initialize Convex first, pause before the authenticated deployment, and continue after Step 7 supplies the issuer.

Acceptance check:

- Convex code generation succeeds.
- Schema and functions deploy without errors.
- Development limits are deliberately low.
- No server secret is present in a public or `NEXT_PUBLIC_*` variable.

### Step 7 — Configure Clerk development authentication

Actions:

1. Create a Clerk development application.
2. Enable verified-email sign-in.
3. Activate the Convex integration.
4. Confirm token audience `convex`.
5. Confirm tokens contain primary email and boolean `email_verified` claims.
6. Configure local `.env.local`:

```dotenv
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_CONVEX_URL=<development Convex URL>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<development publishable key>
CLERK_SECRET_KEY=<development secret key>
```

7. Add the Clerk issuer to Convex development and redeploy Convex auth configuration.

Acceptance check:

- Clerk can issue a Convex-compatible token.
- `.env.local` is ignored by Git.
- No key was committed or recorded in this file.

### Step 8 — Verify the connected application locally

Actions:

1. Run `npm run build`.
2. Run `npm run dev`.
3. Test signed-out, admin, allowed tester, unlisted, and unverified states.
4. Confirm an allowed user can create, save, reopen, rename, edit, export, and delete an idea.
5. Record browser and terminal errors.

Acceptance check:

- Full production build passes.
- Correct users are allowed or denied by the backend.
- Core saved-idea operations work against Convex.

### Step 9 — Run live access, ownership, resilience, and AI checks

Actions:

1. Use two genuine accounts to test cross-account isolation on every idea operation.
2. Confirm a normal user cannot administer invites or pricing.
3. Test allowlist revocation during an open session and active research.
4. Complete a Basic idea and confirm it makes no web-research call.
5. Run Intermediate and Advanced research and inspect real citations.
6. Test refresh, cancel, retry, deletion during research, provider failure, rate limiting, malformed output, and spending-limit errors.
7. Confirm private response IDs, keys, and raw provider payloads do not reach the browser.

Acceptance check:

- Ownership and admin boundaries hold.
- All three product levels behave as designed.
- Failures preserve saved work and show safe messages.
- Test evidence is recorded without user idea content or secrets.

### Step 10 — Create isolated production services

Actions:

1. Create a production Convex deployment.
2. Create or activate a Clerk production instance.
3. Create a separate production OpenAI project and key.
4. Configure production Convex environment values separately from development.
5. Add the verified owner email to `ADMIN_EMAILS`.
6. Set low initial daily limits and provider-level spending controls.
7. Keep `BILLING_ENABLED=false`.

Acceptance check:

- Development and production databases, credentials, and provider keys are separate.
- Production settings contain no placeholder values.
- Spending controls are active.

### Step 11 — Configure custom domain and production Clerk

Actions:

1. Ask the user for the final domain and DNS destination.
2. Configure the domain in Vercel and Clerk.
3. Add required DNS records.
4. Activate Clerk's production Convex integration.
5. Set the production Clerk issuer in the production Convex deployment.
6. Update production Clerk keys after any domain-generated key change.

Acceptance check:

- DNS and TLS certificate are valid.
- Clerk production domain, keys, and Convex issuer match.
- Authentication redirects return to the intended production domain.

### Step 12 — Import GitHub repository into Vercel

Actions:

1. Import the private GitHub repository.
2. Confirm the Vercel root directory is the repository root.
3. Select Next.js and Node.js 22.
4. Do not deploy with production secrets until the configuration has been reviewed.

Acceptance check:

- Vercel project is linked to the correct GitHub repository and production branch.
- Root directory and runtime settings are correct.

### Step 13 — Configure Vercel and Convex production deployment

Actions:

1. Set the Vercel build command:

```sh
npx convex deploy --cmd 'npm run build'
```

2. Generate a production Convex deploy key with only the required deployment permission.
3. Configure production-only Vercel variables:

```dotenv
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<production key>
CLERK_SECRET_KEY=<production secret>
CONVEX_DEPLOY_KEY=<production deploy key>
```

4. Set `NEXT_PUBLIC_CONVEX_URL` explicitly only if required, and verify it points to production.
5. Never expose the production deploy key to preview branches.
6. If previews are required, use a separate Convex preview deploy key and isolated preview credentials.

Acceptance check:

- Variables are assigned to the correct Vercel environments.
- Production and preview deploy keys are not mixed.
- Configuration review contains variable names and locations, not values.

### Step 14 — Deploy and verify a hosted preview

Actions:

1. Create a deployment from a non-production branch using isolated preview services.
2. Review build and Convex deployment logs.
3. Run the hosted smoke checks from Steps 8 and 9.
4. Fix each discovered issue through a separate approved step or sub-step.

Acceptance check:

- Hosted preview builds successfully.
- Preview does not read or alter production data.
- Authentication, storage, and required AI flows pass.

### Step 15 — Deploy and verify production

This step requires explicit approval that clearly names the production deployment.

Actions:

1. Record the exact Git commit selected for release.
2. Merge or push it to the production branch.
3. Verify Vercel and Convex deployments completed.
4. Test the custom domain with admin, allowed tester, and denied user accounts.
5. Complete a small Basic flow and one controlled research flow.
6. Inspect service logs and provider usage.
7. Record the prior Vercel deployment available for rollback.

Acceptance check:

- Production works on the custom domain.
- Only verified, allowed accounts can access application data.
- Frontend points only to production Convex.
- No unexpected errors or cost spikes appear.

### Step 16 — Configure monitoring, limits, rollback, and beta operations

Actions:

1. Configure billing and failure alerts in Vercel, Convex, Clerk, and OpenAI where available.
2. Document tester revocation.
3. Document secret rotation for every service.
4. Document Vercel rollback and how backend schema compatibility will be checked before rollback.
5. Establish a support contact and data-retention policy.
6. Start with one admin and one tester before expanding access.

Acceptance check:

- A named owner receives alerts.
- Rollback, revocation, and secret rotation instructions have been checked.
- Spending limits remain active.
- Billing remains disabled in the application.

### Step 17 — Final handoff and release record

Actions:

1. Re-run the full verification suite from a clean clone where practical.
2. Confirm the progress ledger is complete and accurate.
3. Record the production URL, release commit, release tag, service owners, and verification date without recording secrets.
4. Create a release tag such as `v0.1.0-beta.1` after user approval.
5. Provide the user with remaining risks and recommended first-beta limits.

Acceptance check:

- Fresh installation uses `npm ci` successfully.
- Tests, type checking, demo build, and Next.js build pass.
- GitHub, Vercel, Convex, Clerk, and OpenAI integrations are verified.
- Release and rollback references are recorded.
- No required work is hidden behind a `COMPLETE` status.

## Final definition of done

Deployment is complete only when all of the following are true:

- A fresh clone installs with `npm ci`.
- Automated tests, type checking, demo build, and production build pass.
- The public GitHub repository and its history contain no secrets.
- Vercel deploys the selected commit from `main`.
- Convex production functions deploy during the Vercel build.
- Clerk production login works on the custom domain.
- Backend allowlist, verification, admin, and ownership checks pass with real accounts.
- Basic, Intermediate, and Advanced flows work with the intended AI behavior.
- Monitoring, spending limits, rollback, revocation, and secret rotation are documented.
- `BILLING_ENABLED=false` remains set.

## Official references

- Convex with Vercel: https://docs.convex.dev/production/hosting/vercel
- Convex with Clerk: https://docs.convex.dev/auth/clerk
- Vercel environments: https://vercel.com/docs/deployments/environments
- Vercel environment variables: https://vercel.com/docs/environment-variables
- GitHub repository quickstart: https://docs.github.com/en/repositories/creating-and-managing-repositories/quickstart-for-repositories
