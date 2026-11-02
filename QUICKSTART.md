# Spinlearn quick start

Use Node.js 24.x and a Neon PostgreSQL database. From this project directory:

```powershell
npm install --legacy-peer-deps
Copy-Item .env.example .env.local
```

Put your Neon connection string in `.env.local` as `DATABASE_URL`, keeping `sslmode=require`. Then:

```powershell
npm run db:migrate
npm run db:check
npm run dev
```

Open http://localhost:3000 and learn without signing in. Create an account or log in only when you want to save or check personal progress. There are no default credentials.

## Try the interface

1. Spin on **Today**, save a topic, and use the navigation to open **Library**.
2. Choose **Saved** to find your bookmarks. Search and filter selections remain in the URL.
3. Open any of the **42 topics** for a complete five-step lesson, from gradient descent and CNNs to RAG, LoRA, diffusion, and alignment.
4. Explore the interactive Intuition step, rendered Math, and copyable Code.
5. Use **Complete & next** to confirm each reading section. Answer every Quiz question correctly, then choose **Mark as learned**. Tabs and Back only navigate; opening a section does not complete it.
6. Log in and open **Progress** to see your saved completion, streak, calendar, and quiz result on any device.
7. Update your name/timezone in **Settings** and reload to verify persistence.

Every topic includes its own explanations, formulas, runnable Python example, glossary, a Concept-only Quick check, and a separate two-question final Quiz. The Concept question is not repeated in later sections or in the final Quiz. Your saved practice answer returns when you revisit Concept. All seven category pools are populated. For the widest spin pool, choose **All** and **All levels**. Your existing daily pick and re-spin limit are preserved, but you can open any lesson directly from the Library.

**Sign out** ends your server session. On the signed-out screen, **Login again** opens the login-ID/password form. Correct credentials return you to Today with the same account's saved learning data.

Credentials, sessions, and signed-in learning progress persist in Neon PostgreSQL. Refresh or return to a tab to load changes from another device. Guest interactions are temporary for the current visit. Email delivery, password recovery, and automated content generation are not connected.

## Deploy or move existing data

Follow [Deploy to Vercel + Neon in README](README.md#deploy-to-vercel--neon) for the exact setup.

- Use the optional `db:import-sqlite` command before creating Neon accounts to retain earlier account IDs/passwords.
- For the existing deployed site, run the updated `npm run db:migrate` and `npm run db:check` before deploying this release. Do not re-import SQLite accounts into the populated Neon database.
- On the original browser, log in and choose **Upload browser progress** if offered. It imports only into an empty account record. A confirmed backup restore in Settings can intentionally replace existing server progress.
- Add the secret `DATABASE_URL` to Vercel. The checked-in configuration handles installation and building.
- Set `SITE_URL=https://spinlearn-rosy.vercel.app`. Submit `/sitemap.xml` in Google Search Console after deployment; optional HTML-tag verification uses `GOOGLE_SITE_VERIFICATION`.
- Review the public `/privacy` and `/declaration` pages. They use Sakshi and `spinlearn025@gmail.com` as the operator/contact.
- Keep local `.env.local`, SQLite files, and personal backup JSON out of GitHub and Vercel uploads.

## Check the application

```powershell
npm test
npm run type-check
npm run lint
npm run build
```

Python 3 must be available as `python` for the inline-code content tests; those examples use only the standard library. Unit tests exercise PostgreSQL locally without Neon credentials. Browser tests create generated accounts: use a separate server with a disposable Neon branch in `DATABASE_URL`, set `PLAYWRIGHT_BASE_URL` to that server, then run `npm run test:ui`. See [README.md](README.md) for configuration and deployment requirements.

## If styles look missing

Confirm [postcss.config.js](postcss.config.js) is present and restart the dev server. If a stale build still serves unprocessed Tailwind directives, stop the server and clear only `.next\cache\webpack`, then restart. There is no need to delete dependencies or the lockfile.

For implementation scope and production requirements, see [README.md](README.md).
