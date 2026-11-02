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

Open http://localhost:3000. Create an account on your first visit, then use its login ID and password. There are no default or hardcoded credentials.

The legacy peer-dependency option accommodates the project's existing React/testing-library dependency versions. Do not use an automatic force-upgrade to resolve dependency advisories without testing the resulting changes.

## Deploy to Vercel + Neon

### 1. Create the Neon database

1. Create a **Free** Neon project at [Neon](https://console.neon.tech).
2. Choose a region near the Vercel function region and your expected users.
3. In **Connect**, choose the target branch/database and copy its PostgreSQL connection string. A pooled string is supported. Keep `sslmode=require` (or stricter).
4. Put the string in your local `.env.local` as `DATABASE_URL`. Set `APP_URL=http://localhost:3000` for local development.
5. Run `npm run db:migrate`, then `npm run db:check`.

Schema setup creates the `spinlearn_auth` schema and its accounts, sessions, and rate-limit tables in a transaction. It is safe to run again without deleting existing records. Schema setup is intentionally **not run at every request or build**. The production build works without database credentials.

### 2. Optional: keep accounts you created locally

Do this **before registering any account in the Neon database**:

```powershell
npm run db:import-sqlite -- --source ".data\auth.sqlite" --confirm
```

This opt-in command reads your earlier SQLite file without changing it and uploads account IDs, display names, and existing scrypt password hashes to your configured Neon database. Passwords and account IDs remain the same. Sessions and old rate-limit state are deliberately not copied; sign in again.

The target account table must be empty. A populated target or any failed row causes a transaction rollback, not a partial import or overwrite. Do not upload the SQLite file to GitHub/Vercel or copy it into the deployed application. Keep a private backup until migration has been verified. `SPINLEARN_AUTH_DB_PATH` is no longer used by the web app.

If you do not need earlier accounts, skip this step and register a new account after setup.

### 3. Optional: carry learning progress to the new domain

Browser storage is scoped to its site origin: `localhost` and `your-app.vercel.app` do not share it.

1. After importing accounts, start the app locally against Neon and log in with the original account.
2. Open **Settings -> Move your learning data -> Download learning backup**.
3. After deploying, log in to that same account on the new site.
4. Choose **Import learning backup** and confirm replacement.

The backup contains profile preferences, bookmarks, spins, quiz/practice state, and learning history, **not passwords or sessions**. Import is allowed only for the same account UUID. This is why importing old accounts before creating replacements matters. The old browser data is not deleted automatically. Treat backup JSON as private.

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

- **Today:** server-selected topic, 3.4-second reel, reduced-motion support, one local re-spin per day, bookmarks, and real local metrics.
- **Library:** 42 complete AI lessons across seven areas, responsive cards, search, URL-synced category/level/status/saved filters, sorting, and 20-topic pagination. Client-side filter updates use the browser history API without navigation requests, so a stale search cannot restore cleared filters.
- **Lessons:** five clickable steps, persistent step progress, interactive KV-cache and attention demonstrations, KaTeX formulas, syntax-colored code, copying, a downloadable handover example, quizzes, glossary explanations, and completion/review states.
- **Progress:** an 84-day activity calendar, streaks, recent completions, quiz accuracy, and mastery by category.
- **Settings:** saved display name/timezone, explicit local-storage information, disabled/unconnected email reminders, and a confirmation dialog for resetting local data.
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

Existing local progress, bookmarks, and today's selected topic are preserved. The existing daily re-spin limit has not changed; the Library always allows direct access to every lesson.

Content lives in [lib/content](lib/content), grouped by subject. [lib/data.ts](lib/data.ts) owns the catalogue metadata, and [lib/lessons.ts](lib/lessons.ts) validates and assembles each lesson. Lesson pages load only the selected lesson and glossary from the server rather than bundling the whole course into the browser. Examples are deliberately small teaching programs, not claims to implement full production model training.

Bookmarks, profile settings, spins, lesson progress, and completed quiz results are stored under `spinlearn.learning.v1:<account-id>` in this browser's local storage. Data survives reloads and is synchronized between tabs, but not between devices. Invalid or unavailable storage is reported visibly rather than silently discarded. This is account separation in the UI, not encryption against someone with access to this browser or device.

The first account used in this browser claims the old preview record once, retaining its profile, bookmarks, and progress. Later accounts start with separate empty records and cannot import that preview. The original preview record is retained as a backup; resetting an account does not re-import it.

**Sign out** revokes the server session and clears its cookie without deleting learning data. The signed-out screen offers **Login again**, which opens `/login` with login ID and password fields. `/register` creates accounts with a display name, case-insensitive login ID, and a password of at least 12 characters. Password fields support password managers and an explicit show/hide control.

Credentials are salted and hashed using scrypt, never saved as plaintext or put in browser storage. Seven-day random sessions are stored as hashes in Neon PostgreSQL and sent in `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production). Login/account endpoints check trusted deployment origins and enforce shared database-backed attempt limits. App pages and lesson APIs require a valid server session; changing an old local preview flag cannot log someone in. Account changes synchronize across open tabs.

The web app does not create tables or write database files in serverless storage. Account creation with session issuance, session rotation, and rate-limit increments are atomic PostgreSQL statements. The Neon HTTP driver needs no process-local connection pool. Schema creation and the optional legacy SQLite import are separate operator commands.

Section completion is stored separately from visit history. **Complete & next** confirms a reading section; tabs and Back only navigate. Quiz is complete only after **every answer is correct** in a checked full attempt. Retrying clears the Quiz confirmation until another perfect attempt. The current section is outlined, and only confirmed sections have filled bars and checkmarks. Library `n/5` counts confirmations, not visits.

Changing sections with **Back**, **Complete & next**, or a step tab immediately returns the lesson to the top after the new section renders. Answering questions or saving progress within the same section does not reset the scroll position.

**Quick check belongs only to Concept.** It does not appear in Intuition, Math, Code, or Quiz, and its question is excluded from the final assessment. Its separate saved answer and feedback return when you revisit Concept or reload there. **Try again** clears only the practice result while retaining its selection. Practice never completes a section or changes the final Quiz result or completion status.

Each authored question bank keeps the Concept question first. The published lesson contract exposes it as `steps.concept.quick_check`; `quiz` contains the two remaining questions. Validation rejects duplicate practice questions in the final Quiz. When an older three-question attempt is opened, its remaining answers are matched by question ID and rescored for the two-question assessment. Earlier activity/completion history and Quick check data are preserved, and the UI announces migrated attempts. Unmatched changed questions require a fresh attempt rather than guessed answers.

Earlier versions did not save Quick check answers, so those already-lost selections cannot be reconstructed. Existing full-quiz results and completion history are not used to guess a practice answer or overwritten by the new practice state.

Older saved data without section confirmations starts with no sections checked; visits, scores, and prior lesson results are retained rather than guessed or erased. The separate historical result remains visible in Progress, while new section confirmations must be earned explicitly.

Statistics start at zero. A new lesson completion is counted after confirming all four reading sections, correctly answering every quiz question, and choosing **Mark as learned**. Existing completion history is preserved. Mastery requires a latest score of at least 80%. Activity counts unique topics completed on each local date. Quiz accuracy covers completed lessons over the last 30 local dates. Visible lesson time is recorded on completion and capped at 30 minutes per topic/day.

The daily re-spin limit is enforced in the local interface only. Server-side learning-data sync/quota enforcement, email delivery, password recovery, email verification, and AI lesson generation are **not connected**.

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
| `POST /api/v1/spin` | Accepts category, level, re-spin flag, and optional excluded slug. Returns the chosen topic and a validated 42-row reel with the choice at index 40. |
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
