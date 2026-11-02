# Spinlearn

A responsive daily AI-learning interface built with Next.js 15, React, TypeScript, and Tailwind CSS, following the supplied handover mockups.

## Run locally

Use **Node.js 24.x**. Runtime accounts, sessions, and login rate limits use **Neon PostgreSQL over HTTPS**, not a local SQLite file. No paid AI-model API is needed for the authored lessons.

```powershell
npm install --legacy-peer-deps
Copy-Item .env.example .env.local
```

Edit `.env.local`, replacing `DATABASE_URL` with your Neon connection string. Do not paste the connection string into chat, source code, or a public issue. Then:

```powershell
npm run db:migrate
npm run db:check
npm run dev
```

Open http://localhost:3000 and start learning without an account. Log in only to save bookmarks/progress or open personal Progress and Settings. There are no default or hardcoded credentials.

The legacy peer-dependency option accommodates the project's existing React/testing-library dependency versions. Do not use an automatic force-upgrade to resolve dependency advisories without testing the resulting changes.

## Updating the existing live site

The public-learning/server-progress release adds one table, `spinlearn_auth.learning_state`, without deleting or rewriting accounts or sessions.

1. **Before publishing the new code**, run `npm run db:migrate` and `npm run db:check` with the existing production Neon `DATABASE_URL` configured privately. These commands create the missing table and verify access. Do not run `db:import-sqlite` again against the already populated production database.
2. In Vercel Production environment variables, set `SITE_URL=https://spinlearn-rosy.vercel.app` (or your future canonical custom domain). Keep the existing secret `DATABASE_URL` and origin configuration.
3. Publish/merge the tested code and let Vercel deploy it. A preview deployment should use a separate Neon branch with the same migration.
4. Visit the homepage, Library, a lesson, `/privacy`, and `/declaration` while signed out. They must load without a login redirect. `/progress` and `/settings` should request login.
5. Sign in from the browser that has your old progress. If your server record is empty, choose **Upload browser progress**. This explicitly transfers your existing account's browser data to Neon. The previous browser copy stays intact. If server progress already exists, it is not overwritten automatically; a confirmed backup import in Settings is available when replacement is really intended.
6. Log in in a different browser/device and confirm that the same lessons, bookmarks, quiz results, and history appear.
7. Review the public policy wording for your audience and applicable law. The published operator/contact are **Sakshi** and **spinlearn025@gmail.com**; privacy/declaration text is not a legal-compliance certification.
8. Add a URL-prefix property for the site in Google Search Console. For HTML-tag verification, set the token as `GOOGLE_SITE_VERIFICATION` in Vercel and redeploy. Submit `https://spinlearn-rosy.vercel.app/sitemap.xml`. Search engines control indexing and ranking; SEO metadata does not guarantee either.

If the migration has not been run, signed-in progress calls show an explicit save/load error rather than falling back to browser-only storage. Public guest lessons remain available.

## Deploy to Vercel + Neon

### 1. Create the Neon database

1. Create a **Free** Neon project at [Neon](https://console.neon.tech).
2. Choose a region near the Vercel function region and your expected users.
3. In **Connect**, choose the target branch/database and copy its PostgreSQL connection string. A pooled string is supported. Keep `sslmode=require` (or stricter).
4. Put the string in your local `.env.local` as `DATABASE_URL`. Set `APP_URL=http://localhost:3000` for local development.
5. Run `npm run db:migrate`, then `npm run db:check`.

Schema setup creates the `spinlearn_auth` schema and its accounts, sessions, rate-limit, and learning-state tables in a transaction. It is safe to run again without deleting existing records. Schema setup is intentionally **not run at every request or build**. The production build works without database credentials.

### 2. Optional: keep accounts you created locally

Do this **before registering any account in the Neon database**:

```powershell
npm run db:import-sqlite -- --source ".data\auth.sqlite" --confirm
```

This opt-in command reads your earlier SQLite file without changing it and uploads account IDs, display names, and existing scrypt password hashes to your configured Neon database. Passwords and account IDs remain the same. Sessions and old rate-limit state are deliberately not copied; sign in again.

The target account table must be empty. A populated target or any failed row causes a transaction rollback, not a partial import or overwrite. Do not upload the SQLite file to GitHub/Vercel or copy it into the deployed application. Keep a private backup until migration has been verified. `SPINLEARN_AUTH_DB_PATH` is no longer used by the web app.

If you do not need earlier accounts, skip this step and register a new account after setup.

### 3. Optional: carry earlier browser-only progress to the server

Browser storage is scoped to its site origin: `localhost` and `your-app.vercel.app` do not share it.

1. After importing accounts, start the app against Neon and sign in in the browser/site origin that holds the original progress.
2. If offered, choose **Upload browser progress**. It is imported only into an empty server learning record.
3. Alternatively, use an earlier backup through **Settings -> Your data and backups -> Import learning backup** and confirm replacement.
4. Sign in to the same account on another device or origin: it now loads the server copy.

The backup contains profile preferences, bookmarks, spins, quiz/practice state, and learning history, **not passwords or sessions**. Import is allowed only for the same account UUID and replaces that account's server record, with a stale-revision check to avoid overwriting newer changes. This is why retaining account IDs matters. Old browser data is not deleted automatically. Treat backup JSON as private.

### 4. Put the app in your own GitHub repository

Commit the application, dependency lockfile, and configuration files. The Git and Vercel ignore rules exclude `.env*` secrets, `.data`, SQLite files, and generated learning backups; `.env.example` contains placeholders only.

Check the files before pushing, especially if you have ever manually tracked credentials or database files. Ignore rules do not remove files already committed. GitHub stores the code; **GitHub Pages is not used**.

### 5. Import the repository into Vercel

Create a Vercel project with the **Next.js** preset. Select the directory containing [package.json](package.json) as the Root Directory:

- If this repository contains the app directly, use the repository root.
- If it contains the surrounding projects folder, choose `spinlearn-app`.

Use **Node.js 24.x**. [vercel.json](vercel.json) configures:

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Install command | `npm ci --legacy-peer-deps` |
| Build command | `npm run build` |
| Output directory | Leave the Next.js default; do not use a static export |

### 6. Set Vercel environment variables, then deploy

| Variable | Where | Value |
| --- | --- | --- |
| `DATABASE_URL` | Production | The secret Neon production connection string |
| `APP_URL` | Production, if using a custom/canonical domain | The exact origin, e.g. `https://learn.example.com`, without a path |
| `DATABASE_URL` | Preview, only if enabling preview logins | A separate disposable Neon branch/database |
| `APP_URL` | Local development | `http://localhost:3000` |
| `SITE_URL` | Production | `https://spinlearn-rosy.vercel.app` or the canonical custom HTTPS origin |
| `GOOGLE_SITE_VERIFICATION` | Production, optional | The public HTML-tag verification token from Google Search Console |

For Vercel's generated URLs, `APP_URL` can be omitted if **Automatically expose System Environment Variables** is enabled. The app accepts only its exact `VERCEL_URL`, branch URL, and production domain supplied by Vercel. It does **not** trust every `*.vercel.app` site or arbitrary forwarded headers.

Do not copy the localhost `APP_URL` into production. Scope a custom `APP_URL` to Production instead of forcing it onto preview deployments. Never name the database secret `NEXT_PUBLIC_DATABASE_URL`. Do not set a SQLite path or override `NODE_ENV` in Vercel.

Click **Deploy** and use the included HTTPS `.vercel.app` URL; a paid custom domain is optional. When you change environment variables, redeploy for them to take effect.

### 7. Verify the deployed site

- Open `/register` and create a test account, or log in to an imported account.
- Confirm a wrong password is rejected and sign-out requires logging in again.
- Browse topics, finish a lesson, and reload to verify browser progress.
- Redeploy once and confirm the account still works: accounts must persist in Neon.
- Check Vercel runtime logs for database/schema/origin errors. `503 AUTH_NOT_CONFIGURED` means deployment configuration is incomplete; `403 INVALID_ORIGIN` means the request domain is not configured as trusted.
- Enable billing/usage notifications. Stay within both free plans; free allowances and cold starts are not an availability guarantee. Vercel Hobby is for personal, non-commercial use.

The repository changes do not create Neon/Vercel accounts, set remote secrets, or deploy on your behalf. The database URL and actual hosted login flow must be verified after you complete these steps.

## Interface

- **Today:** public topic selection, 3.4-second reel, reduced-motion support, expanded two-sentence cards, and account-backed metrics. Signed-in users have one server-enforced re-spin per local day; guests have two picks for the current visit and can always browse the Library.
- **Library:** 42 complete AI lessons across seven areas, responsive cards, search, URL-synced category/level/status/saved filters, sorting, and 20-topic pagination. Client-side filter updates use the browser history API without navigation requests, so a stale search cannot restore cleared filters.
- **Lessons:** five clickable steps, persistent step progress, interactive KV-cache and attention demonstrations, KaTeX formulas, syntax-colored code, copying, a downloadable handover example, quizzes, glossary explanations, and completion/review states.
- **Progress:** an 84-day activity calendar, streaks, recent completions, quiz accuracy, and mastery by category.
- **Settings:** server-saved display name/timezone, private backup export/import, disabled/unconnected email reminders, and confirmed server learning-data reset.
- Shared desktop/mobile navigation, self-hosted Inter/JetBrains Mono fonts, keyboard focus states, empty states, and error/not-found screens.
- **Profile menu:** hover over or click the avatar for **View profile** and **Sign out**. Keyboard users can open it with Enter, Space, or arrow keys, move between actions, and close it with Escape or by moving focus away. **View profile** opens the profile form in Settings.

## Scope and persistence

This application supports **Vercel + Neon**, but it is not being represented as a fully production-hardened commercial service.

All **42 catalogue topics** have original five-step lessons: Concept, Intuition, Math, Code, and Quiz. Together they include **126 distinct questions: 42 Concept quick checks and 84 final-Quiz questions**, worked examples, runnable standard-library Python, per-lesson glossary definitions, applications, and primary-source/technical references. The catalogue includes all 34 handover terms plus the eight additional existing topics, retaining every existing slug.

| Area | Lessons |
| --- | ---: |
| Foundations | 7 |
| Deep learning | 5 |
| LLMs | 11 |
| Generative AI | 5 |
| Training | 6 |
| Deployment | 5 |
| Alignment | 3 |

Every topic is eligible for the spinner under its category/level filters. **LLMs + Advanced** now includes KV cache, Transformer architecture, and Mixture of experts. Re-spins exclude the previous topic when alternatives exist. A genuinely single-topic selection is identified explicitly; choose **All** for more variety.

The Library and every lesson are public. Login is needed for personal progress, account settings, and saved bookmarks. Guest lesson interactions stay in memory for the current visit; they are not silently attached to a later account.

Content lives in [lib/content](lib/content), grouped by subject. [lib/data.ts](lib/data.ts) owns the catalogue metadata, and [lib/lessons.ts](lib/lessons.ts) validates and assembles each lesson. Lesson pages load only the selected lesson and glossary from the server rather than bundling the whole course into the browser. Examples are deliberately small teaching programs, not claims to implement full production model training.

Bookmarks, profile preferences, spins, lesson progress, practice state, quiz results, and completion history are stored per account in Neon PostgreSQL. Personal snapshots are loaded after login, refreshed on tab return/reload, and refreshed between same-origin tabs using BroadcastChannel. No signed-in progress is newly persisted in localStorage. Server failures are visible and disable further saves until a successful sync; they do not produce success-shaped local fallbacks.

The old `spinlearn.learning.v1:<account-id>` record is read only for an explicit, one-time migration into an empty account record. Existing server progress wins over an older browser copy. Resetting progress preserves the account/profile and does not offer the old browser copy again automatically. Backups remain available for intentional replacement.

**Sign out** revokes the server session and clears its cookie without deleting learning data. The signed-out screen offers **Login again**, which opens `/login` with login ID and password fields. `/register` creates accounts with a display name, case-insensitive login ID, and a password of at least 12 characters. Password fields support password managers and an explicit show/hide control.

Credentials are salted and hashed using scrypt, never saved as plaintext or put in browser storage. Seven-day random sessions are stored as hashes in Neon PostgreSQL and sent in `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production). Login/account endpoints check trusted deployment origins and enforce shared database-backed attempt limits. Personal Progress/Settings and the learning-state API require a valid session; public content APIs do not. Changing a local preview flag cannot grant access to personal server data.

The web app does not create tables or write database files in serverless storage. Account creation with session issuance, session rotation, and rate-limit increments are atomic PostgreSQL statements. The Neon HTTP driver needs no process-local connection pool. Schema creation and the optional legacy SQLite import are separate operator commands.

Learning updates are validated commands rather than arbitrary client snapshots, except for explicit imports. The server verifies the acting account, calculates quiz scores, enforces completion and re-spin rules, and uses compare-and-swap revisions to reapply concurrent updates. Recent request IDs prevent replaying a successful write, while quiz attempt IDs prevent recording the same completion twice. Reset/restore require the current revision. Imported historical scores are retained as prior data, not presented as newly verified assessment results.

Section completion is stored separately from visit history. **Complete & next** confirms a reading section; tabs and Back only navigate. Quiz is complete only after **every answer is correct** in a checked full attempt. Retrying clears the Quiz confirmation until another perfect attempt. The current section is outlined, and only confirmed sections have filled bars and checkmarks. Library `n/5` counts confirmations, not visits.

Changing sections with **Back**, **Complete & next**, or a step tab immediately returns the lesson to the top after the new section renders. Answering questions or saving progress within the same section does not reset the scroll position.

**Quick check belongs only to Concept.** It does not appear in Intuition, Math, Code, or Quiz, and its question is excluded from the final assessment. Its separate saved answer and feedback return when you revisit Concept or reload there. **Try again** clears only the practice result while retaining its selection. Practice never completes a section or changes the final Quiz result or completion status.

Each authored question bank keeps the Concept question first. The published lesson contract exposes it as `steps.concept.quick_check`; `quiz` contains the two remaining questions. Validation rejects duplicate practice questions in the final Quiz. When an older three-question attempt is opened, its remaining answers are matched by question ID and rescored for the two-question assessment. Earlier activity/completion history and Quick check data are preserved, and the UI announces migrated attempts. Unmatched changed questions require a fresh attempt rather than guessed answers.

Earlier versions did not save Quick check answers, so those already-lost selections cannot be reconstructed. Existing full-quiz results and completion history are not used to guess a practice answer or overwritten by the new practice state.

Older saved data without section confirmations starts with no sections checked; visits, scores, and prior lesson results are retained rather than guessed or erased. The separate historical result remains visible in Progress, while new section confirmations must be earned explicitly.

Statistics start at zero. A new lesson completion is counted after confirming all four reading sections, correctly answering every quiz question, and choosing **Mark as learned**. Existing completion history is preserved. Mastery requires a latest score of at least 80%. Activity counts unique topics completed on each local date. Quiz accuracy covers completed lessons over the last 30 local dates. Visible lesson time is recorded on completion and capped at 30 minutes per topic/day.

Email delivery, password recovery, email verification, and live AI lesson generation are **not connected**. Account-deletion requests go to the operator's published contact; the Settings reset only removes learning history/bookmarks/spins, not the login account.

## Privacy, declaration, and SEO

- Public `/privacy` explains guest behavior, essential sessions, Neon account/progress storage, platform logs, old browser migration, exports, reset, retention, and contact requests.
- Public `/declaration` covers educational limitations, AI-assisted content, acceptable use, third-party references, availability, and non-excludable rights. The operator should obtain legal review appropriate to the intended audience.
- Public routes have individual titles/descriptions, canonical URLs, Open Graph/Twitter metadata, and a generated sharing image.
- Lesson Concept content renders in server HTML without JavaScript, and each lesson has LearningResource JSON-LD.
- `/sitemap.xml` lists all 42 lessons and public landing/legal pages. `/robots.txt` excludes APIs and account pages. Login, registration, progress, settings, and signed-out pages have noindex metadata.
- Preview deployments are marked noindex and disallowed in robots. Set `SITE_URL` when changing the canonical production domain.

## Styling

[postcss.config.js](postcss.config.js) compiles Tailwind directives. [tailwind.config.ts](tailwind.config.ts) defines the handover's semantic colors, typography, spacing, and borders. [app/globals.css](app/globals.css) supplies the framed layout, controls, responsive reel, and reduced-motion rules.

After adding or changing PostCSS plugins, restart the dev server. If an older development build still serves raw `@tailwind` or `@apply` directives, stop that app's dev server and remove only its generated `.next\cache\webpack` cache before restarting. Do not delete source files or reinstall dependencies for this cache issue.

Fonts are self-hosted; the UI does not fetch fonts from an external CDN.

## API

| Endpoint | Behavior |
| --- | --- |
| `POST /api/auth/register` | Creates an account and establishes a session; validates password confirmation. |
| `POST /api/auth/login` | Verifies the login ID/password and rotates the current session. |
| `POST /api/auth/logout` | Revokes the current session and clears its cookie. |
| `GET /api/auth/session` | Returns the signed-in account, or 401. |
| `GET /api/v1/learning` | Private, no-store account snapshot and revision; requires login. |
| `POST /api/v1/learning` | Authenticated same-origin commands for profile/bookmarks/steps/quizzes/completion/spins/import/reset, with validated input and revision protection. |
| `POST /api/v1/spin` | Public selection endpoint. Returns a chosen topic and validated 42-row reel; signed-in selection is saved and quota-checked through the learning-state endpoint. |
| `GET /api/v1/topics` | Lists catalogue topics with search, category/level filtering, sorting, and pagination. User-specific filters are applied in the local UI. |
| `GET /api/v1/lessons/[slug]` | Returns the requested complete lesson and its glossary for all 42 topics. An unknown topic returns `404 NOT_FOUND`. |

The supplied working Python example is available at [public/examples/kv_cache_demo.py](public/examples/kv_cache_demo.py).

## Validation

```powershell
npm test
npm run type-check
npm run lint
npm run build
```

The unit/integration suite uses an embedded PostgreSQL engine to execute the same SQL and authentication endpoints without Neon credentials. It tests constraints, atomic rollback, expiry, revocation, rate limits, origins, and schema/import behavior. It does not substitute for a live hosted smoke test.

With a test server configured with a **disposable Neon branch** in `DATABASE_URL` and the corresponding `APP_URL`:

```powershell
npm run test:ui
```

Set `PLAYWRIGHT_BASE_URL` when the test server uses a different port, such as `http://localhost:3100`. UI tests use installed Microsoft Edge on Windows and Playwright Chromium on other platforms. They create isolated browser contexts and generated test accounts, so they do not reset your browser's saved data. Use a disposable Neon branch to avoid adding test users or consuming authentication rate limits in production. Tests do not contain reusable credentials.

The tests cover all lesson schemas, valid rendered formulas, 126 answer/explanation mappings, unique topic-specific content, and numerical checks of all 42 runnable Python examples. **Python 3 must be available as `python` to run the content tests; no Python packages are needed for the inline examples.** The separately downloadable handover script uses NumPy.

Browser tests cover all 42 lesson APIs and full lesson completions, every category/level spin pool, re-spin diversity, pagination, compiled CSS, desktop/phone layouts, bookmarks, URL filters, local progress, settings, and reset confirmation.

## Before production

Add account recovery and abuse monitoring, connect server-side learning-data sync and email delivery as needed, obtain an independent subject-matter review of the lessons, enforce learning quotas on the server, and address the existing dependency advisories before broader public use. Authored content and automated checks are not a substitute for expert review; the dependency tree is not being represented as production-hardened.
