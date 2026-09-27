# Zid — زيد

**كول بالعقل، كبّر بالجد · Eat smart, grow hard**

A mobile-first, bilingual (English / Arabic with full RTL) web app for tracking nutrition and strength training. Snap a photo of your plate and AI estimates the macros; log workouts from an illustrated exercise library; track bodyweight, goals and progress. Installable on your phone and usable offline.

---

## Features

| | |
|---|---|
| **📸 Meals by photo** | Take or upload a photo → Google Gemini lists each food with estimated grams, kcal, protein, carbs and fat → you review and edit everything (names, grams, per-100 g values, add/remove items) → nothing is saved until you confirm. Estimates are clearly marked as approximate. |
| **🔎 Manual & barcode** | Search your food library and type grams (macros auto-calculate), or scan a packaged product's barcode (Open Food Facts lookup). |
| **🥙 My Foods** | Personal per-100 g food library, seeded with 56 foods incl. Tunisian staples (couscous, tabouna, mlawi, brik, lablabi, ojja, merguez, chamia, harissa, lben, makroudh…). Favorites for one-tap adding; AI-detected foods can be saved. |
| **🎯 Daily goals** | Calories (different target on training days), protein, carbs, fat, water. Today screen shows rings/bars, remaining kcal, water tracker, streak, "copy yesterday". |
| **🏋️ Workouts** | 130 illustrated exercises in 13 muscle groups (EN + AR names and how-to). Pyramid sets (weight × reps per set), notes, rest timer, "last time" + best, 🏆 PR detection, MET-based calories burned. |
| **⚖️ Body** | Bodyweight + optional arm / chest / thigh / waist / body-fat, change vs previous entry, trend chart. |
| **📈 Progress** | 7 / 30-day charts: calories vs goal, protein, calories burned; each chart has a table view. |
| **🌍 EN / AR** | Full translations, RTL layout, Arabic plural rules, language synced to your account. |
| **📱 PWA** | Install to home screen, offline app shell, offline data cache, meal/workout reminders, CSV export. |
| **💾 Import / export** | Load historical data from a Zid JSON file (`zid_data_export.json`) with a preview and no duplicates; export a backup in the same format. |

## Tech stack

React 19 · Vite 6 · TypeScript · Tailwind CSS 4 · Firebase Auth + Cloud Firestore · Google Gemini (via a Netlify Function) · Recharts · react-i18next · vite-plugin-pwa · ZXing / BarcodeDetector · Netlify

---

## Setup

You need **Node.js 20+** and **npm**. (Netlify builds with Node 22.)

### 1. Create the Firebase project

1. Go to **https://console.firebase.google.com** → **Create a project** (or **Add project**).
2. Name it (e.g. `zid`) → Continue. Google Analytics is optional (you can turn it off) → **Create project**.
3. **Register a web app:** on the project overview page click the **`</>` (Web)** icon → nickname `zid-web` → leave "Firebase Hosting" **unchecked** → **Register app**.
   Firebase shows a `firebaseConfig` object with `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`. Keep this page open — these go into your env vars (step 3).
   *(You can find it again any time: ⚙️ **Project settings** → **General** → **Your apps**.)*
4. **Enable sign-in:** left menu **Build → Authentication** → **Get started** → tab **Sign-in method**:
   - **Email/Password** → toggle **Enable** → Save.
   - **Google** → toggle **Enable** → choose a **support email** → Save.
5. **Create the database:** **Build → Firestore Database** → **Create database** →
   - Edition/mode: **Standard**, **Start in production mode**.
   - Location: pick one close to your users, e.g. **`europe-west1` (Belgium)** for Tunisia. ⚠️ This cannot be changed later.
   - **Create**.
6. **Publish the security rules:** in Firestore → **Rules** tab → delete everything → paste the contents of [`firestore.rules`](firestore.rules) → **Publish**.
   Make sure the database selector at the top says **(default)**.
   *(Alternative from the terminal: `npx firebase-tools login`, then `npm run deploy:rules -- --project <your-project-id>`.)*

> **Cloud Storage is not needed.** Meal photos are stored as small (~20 KB) thumbnails inside Firestore, so the app runs entirely on Firebase's free **Spark** plan. (New projects need the paid Blaze plan to use Storage.)

### 2. Get a Google Gemini API key

1. Go to **https://aistudio.google.com** and sign in with your Google account.
2. Click **Get API key** (left sidebar) → **Create API key** → choose a Google Cloud project (or let it create one) → copy the key.
3. The free tier is enough for personal use. The key is only ever used by the server-side function — never shipped to the browser.

The default model is `gemini-3.8-flash`, with automatic fallback to `gemini-flash-lite-latest` when it is busy. Set `GEMINI_MODEL` to pin another model.

### 3. Environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Where it's used | Value |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | browser | from the Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | browser | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | browser **and** function (verifies sign-in tokens) | your project id |
| `VITE_FIREBASE_STORAGE_BUCKET` | browser | from the web config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | browser | from the web config |
| `VITE_FIREBASE_APP_ID` | browser | from the web config |
| `GEMINI_API_KEY` | **function only** — secret | your Gemini key |
| `GEMINI_MODEL` | function (optional) | e.g. `gemini-3.8-flash` |

`.env.local` is git-ignored. **Never put `GEMINI_API_KEY` in `.env.example`** or give it a `VITE_` prefix (that would publish it in the browser bundle).

> The `VITE_FIREBASE_*` values are *meant* to be public — every Firebase web app ships them. Your data is protected by the Firestore rules, not by hiding the config. For extra safety, restrict the key in Google Cloud Console → APIs & Services → Credentials → your "Browser key" → **Website restrictions**: `localhost:*`, `your-site.netlify.app/*`, and your custom domain.

### 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server also serves the Gemini function at `/.netlify/functions/analyze-meal` (no Netlify CLI needed) and re-reads `.env.local` on every call.

Other scripts:

| Script | What it does |
|---|---|
| `npm run build` | type-check + production build (with service worker) into `dist/` |
| `npm run preview:pwa` | build and serve the production app on :4174 (test install/offline) |
| `npm test` | unit tests (macro math, streaks, PRs, calorie formula, translations) |
| `npm run build:exercises` | regenerate `src/data/exercises.json` + images from free-exercise-db |
| `npm run build:icons` | regenerate the PWA icons from `public/icon.svg` |
| `npm run deploy:rules` | publish `firestore.rules` with the Firebase CLI |

---

## Deploy to Netlify

### 1. Push the code to GitHub

```bash
git remote add origin https://github.com/<you>/zid.git
git push -u origin main
```

### 2. Create the site

1. **https://app.netlify.com** → **Add new site** → **Import an existing project** → **GitHub** → authorize → pick the `zid` repo.
2. Build settings are read from [`netlify.toml`](netlify.toml) (build `npm run build`, publish `dist`, functions `netlify/functions`, Node 22) — leave them as shown.
3. Before deploying, open **Add environment variables** (or later: **Site configuration → Environment variables → Add a variable**) and add **all 7** variables from the table above (`GEMINI_MODEL` is optional). Keep the default scope **All scopes** — the build needs the `VITE_` ones, the function needs `GEMINI_API_KEY` and `VITE_FIREBASE_PROJECT_ID`. Tick **Contains secret values** for `GEMINI_API_KEY`.
4. **Deploy**. When it finishes you get a URL like `https://zid-xxxx.netlify.app` (rename it under **Site configuration → Site details → Change site name**).

### 3. Allow the domain in Firebase (required for sign-in)

Firebase console → **Authentication → Settings → Authorized domains → Add domain** → `zid-xxxx.netlify.app` (and any custom domain). Without this, Google sign-in fails with `auth/unauthorized-domain`.

### 4. Check it

Open the site on your phone → create an account → add a meal by photo → log a workout. To install: Android/Chrome → menu → **Install app** (or Settings → *Install Zid*); iPhone/Safari → **Share → Add to Home Screen**.

Every `git push` to `main` redeploys automatically. If you change `firestore.rules`, publish them again (step 1.6).

---

## How it works

### Folder structure

```
zid/
├─ netlify/functions/analyze-meal.ts   # Gemini proxy: verifies Firebase ID token, model fallback, 9 s budget
├─ public/                             # icons, sw-notify.js, exercises/<id>/{0,1}.webp
├─ scripts/                            # build-exercises.mjs (+ curation list), build-icons.mjs
├─ src/
│  ├─ app/            # App shell, router, bottom navigation, auth gate
│  ├─ components/     # Sheet, Toast, ProgressRing, NumberField, Screen…
│  ├─ features/
│  │  ├─ auth/        # AuthProvider (creates profile + seeds foods), LoginPage
│  │  ├─ today/       # daily summary
│  │  ├─ meals/       # add-meal flow (photo / search / barcode → review), entry editing
│  │  ├─ foods/       # My Foods library
│  │  ├─ workouts/    # library, session logger, rest timer, draft persistence
│  │  ├─ body/        # bodyweight & measurements
│  │  ├─ progress/    # charts
│  │  └─ settings/    # goals, MET, reminders, export, install
│  ├─ services/
│  │  ├─ foodVision.ts     # ← the ONE place that knows the vision provider
│  │  ├─ data.ts           # every Firestore read/write
│  │  ├─ openFoodFacts.ts  barcode.ts  calories.ts  reminders.ts  export.ts
│  ├─ data/           # seedFoods.ts, exercises.json
│  ├─ i18n/           # en.ts, ar.ts (typed against en), RTL switching
│  └─ lib/            # dates, macro math, records/PRs, streak…
├─ firestore.rules  netlify.toml  .env.example
```

### Data model (Cloud Firestore)

Everything lives under the signed-in user's document, so one rule (`request.auth.uid == uid`) isolates accounts.

| Path | Contents |
|---|---|
| `users/{uid}` | profile: name, language, `goals {kcal, kcalTraining, protein, carbs, fat, waterMl}`, `met {…}`, `reminders {…}`, cached `bodyweightKg` |
| `users/{uid}/foods/{id}` | My Foods: `name`, `nameAr`, `per100g {kcal, protein, carbs, fat}`, `barcode?`, `favorite`, `source` (seed / user / ai / off) |
| `users/{uid}/mealEntries/{id}` | one logged item: `date` ("YYYY-MM-DD", local), `loggedAt`, `mealType`, `foodName`, `grams`, kcal/protein/carbs/fat, `groupId` (items logged together), `photoId?` |
| `users/{uid}/mealPhotos/{id}` | ~20 KB WebP thumbnail (data URL) — kept separate so daily queries stay small |
| `users/{uid}/workouts/{id}` | `date`, `exercises [{exerciseId, sets [{kg, reps}], notes}]`, `intensity`, `caloriesBurned` |
| `users/{uid}/exerciseRecords/{exerciseId}` | last session's sets + best weight / best estimated 1RM → instant "last time" and PRs |
| `users/{uid}/weightLogs/{id}` | `date`, `kg`, optional `arm/chest/thigh/waist/bodyFat` |
| `users/{uid}/days/{date}` | `waterMl`, `trainingDay`, `mealCount` (drives streaks) |

Design choices: sets are embedded in the workout document (one read per session, natural pyramid sets); daily totals and charts are computed on the client from date-range queries (no aggregates to drift); the exercise library ships as static JSON (no reads, works offline). No composite indexes are required.

### Security

- **Firestore rules** ([`firestore.rules`](firestore.rules)): a user can only read/write `users/{their uid}/**`; writes are validated (types, non-negative macros, date format, size limits); everything else is denied.
- **Gemini key** stays in the Netlify Function. The function rejects any request without a valid **Firebase ID token** for your project (verified with Google's public keys via `jose`), so strangers can't spend your quota.

### Food photo analysis

`src/services/foodVision.ts` → `POST /.netlify/functions/analyze-meal` with a ~1024 px JPEG → Gemini with a JSON response schema and a Tunisian-aware prompt → `[{ name, nameAr, grams, kcal, protein, carbs, fat, confidence }]`. The review screen keeps per-100 g values so changing grams rescales the macros.

**Switching provider (Claude / OpenAI):** rewrite `callGemini` in the function (or add a new function) and keep the same response shape; `foodVision.ts` is the only client file that references the endpoint.

The function tries `gemini-3.8-flash` for up to ~6 s, then `gemini-flash-lite-latest`, within a 9 s total budget (Netlify's free plan stops synchronous functions at 10 s). Raise `VISION_BUDGET_MS` if your plan allows longer.

### Calories burned (MET estimate)

```
kcal = MET × bodyweight (kg) × hours
hours = completed sets × minutes per set ÷ 60
```

Defaults: **minutes per set 2.5** (set + typical rest), **MET light 3.5 / moderate 5.0 / hard 6.0** (Compendium of Physical Activities, resistance training). Bodyweight is your latest weigh-in (75 kg until you log one). All four numbers are adjustable in **Settings → Calories burned**. It's an estimate — real burn varies a lot between people.

**PRs** use the heaviest weight and the Epley estimated 1RM (`kg × (1 + reps/30)`, reps capped at 12).

### Offline & reminders

- The app shell is precached by the service worker; exercise images and fonts are cached as you view them. Firestore keeps your data in IndexedDB, so you can log offline and it syncs later. Photo analysis and barcode lookups need a connection.
- Reminders are **local notifications** scheduled while Zid is open (an installed app kept in memory keeps firing them, typically on Android). True background push would need Firebase Cloud Messaging + a server; it's not included.

### Exercise library

`scripts/exercise-curation.mjs` lists the 130 curated exercises (dataset id, muscle group, Arabic name, EN/AR how-to). `npm run build:exercises` downloads [free-exercise-db](https://github.com/yuhonas/free-exercise-db), validates the ids, converts the images to 480 px WebP in `public/exercises/`, and writes `src/data/exercises.json`. User-added exercises with photos are a planned feature.

---

## Importing your data (`zid_data_export.json`)

1. Sign in, open **Settings** (⚙️ top-right) → **Your data** → **Import data (JSON)** → **Choose file** → pick `zid_data_export.json`.
2. The file is checked first. If anything is wrong you get a list naming each problem — e.g. `mealEntries[12].date should be a date like 2026-09-21 (got "21/09/2026")` — and **nothing is written**.
3. Otherwise you see a preview: how many foods, meal entries, workout rows (and days) and weight logs the file has, and what will happen (new vs. already in your account). Goals and body profile from the file are **only applied if you tick them**; they're pre-ticked only if you never changed the defaults.
4. Tap **Import**. Writes go in batches of 400 with a progress bar, then "Imported N records".

**Re-importing is safe.** Every record is matched by content — a meal by date + meal type + food + grams (identical rows, such as two 90 g apples, stay two items), a weight log by date, a workout exercise by name + sets, a food by name — and otherwise gets a deterministic id. Importing the same file twice updates instead of duplicating; if a batch fails midway, just import again.

How the file maps to the app:

| File | App |
|---|---|
| `foods[]` (per 100 g) | **My Foods**. A food whose name already exists is kept as is. |
| `mealEntries[]` | Meal log with the file's macros **as given** (not recomputed). French / English / Arabic labels map to the six meal types — `Petit-déj` → Breakfast, `Déjeuner` → Lunch, `Dîner (tacos)` → Dinner, `Collation` → Snack, `Avant séance` → Pre-workout, `Après séance` → Post-workout — and the original label is kept. |
| `workouts[]` | Rows sharing a `date` become one session (`session` name and `notes` kept). Names are matched to the illustrated library (`Squat`, `Développé couché`, `Tirage vertical`… — see `src/data/exerciseAliases.ts`); numbered or generic ones (`Mollets 1`, `Dos (machine) 2`, `Abdominaux`) keep their own name. Per-set weights come from notes like `30/40/50/60 kg` when the count matches `reps`, otherwise every set uses `chargeKg`; a text weight such as `"léger"` is kept verbatim. Calories burned use the MET formula. |
| `weightLogs[]` | Weight + body fat / measurements (`null` = not measured). |
| `goals`, `profile` | Your settings — only when ticked in the preview. |

**Export:** Settings → **Export backup (Zid JSON)** writes this same format (`schemaVersion: 1`), so a backup can be restored with Import — also into another account.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Import says "Connect to the internet" | Import reads your current data from the server to avoid duplicates, so it needs a connection. |
| "Database access denied" after sign-in | Firestore rules not published (or published to a non-default database) — setup step 1.6. |
| Google sign-in: `auth/unauthorized-domain` | Add the site's domain in Firebase → Authentication → Settings → Authorized domains. |
| "The AI is busy right now" | Gemini returned 503/timeout on every model. Retry in a moment, or add items manually. |
| Photo analysis always fails with a vision provider error | Check `GEMINI_API_KEY` in Netlify (All scopes) and redeploy. If Google retired a model, set `GEMINI_MODEL` to a current one (see the models list in AI Studio). |
| Netlify build fails in "secrets scanning" | `netlify.toml` already skips the public `VITE_FIREBASE_*` keys. If smart detection still flags the Firebase key, add a Netlify env var `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` = your Firebase API key. Never whitelist the Gemini key. |
| Barcode camera doesn't open | Camera needs HTTPS (Netlify ✔, `localhost` ✔) and permission. You can always type the code. |
| Notifications never appear | Allow notifications for the site, keep reminders enabled, use **Send test**. See "Offline & reminders" for the limits. |

---

## Credits & licences

- Exercise data and illustrations: **[free-exercise-db](https://github.com/yuhonas/free-exercise-db)** by yuhonas — The Unlicense (public domain). Arabic names and how-to texts written for Zid.
- Packaged-food data: **[Open Food Facts](https://world.openfoodfacts.org)** — Open Database License (ODbL). Attribution shown in the scanner.
- Seed food values: rounded from USDA FoodData Central, CIQUAL and typical Tunisian recipes — homemade dishes vary; edit them to match yours.
- AI food estimates: Google Gemini. **They are approximate — always review before saving.**
