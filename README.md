# AI CivicEye

AI CivicEye is a civic complaint desk for a municipal team. Citizens submit a photo and a location. A server-side Gemini call can suggest a category, severity, department, and description. Administrators review the queue, assign a department, and compare a repair photo. AI never marks a complaint resolved on its own.

The app is one Vite frontend and one set of Vercel serverless functions. PostgreSQL, authentication, and image storage are Supabase. The map uses OpenStreetMap.

## 1. Prerequisites

- Node.js 22 or newer
- A free [Supabase](https://supabase.com/dashboard) project
- A free [Google AI Studio](https://aistudio.google.com/) Gemini API key
- A [GitHub](https://github.com/) repository and a [Vercel](https://vercel.com/signup) account when you are ready to deploy

You can run the interface without those accounts. That mode is labelled **Demo mode** and uses bundled sample complaints from Bhubaneswar. It does not save data and it does not invent an AI classification.

## 2. Local installation

```bash
cd ai-civiceye
npm install
cp .env.example .env
```

Leave the values blank to use demo mode. Fill them in when Supabase and Gemini are ready.

## 3. Supabase project setup

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In **Project Settings → API**, copy the project URL and the `anon` public key.
3. Copy the `service_role` key as well. It is a secret. Put it only in server environment variables.
4. In `.env`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

`SUPABASE_URL` should be the same project URL. Do not prefix the service role key with `VITE_`.

## 4. Database migration

Vercel does not create the database.

1. Open the Supabase **SQL Editor**.
2. Paste and run [supabase/migrations/001_init.sql](supabase/migrations/001_init.sql) once.
3. The script creates tables, indexes, row level security, department rows, a profile trigger, and the `complaint-images` storage bucket.

If the storage section fails, create the bucket in the dashboard as described below and rerun only the storage statements. The table statements are in a transaction, so a failure rolls the whole script back.

## 5. Supabase storage bucket

The migration creates a public bucket named `complaint-images` and allows public read. Uploads go through the API with the service role after the file type and size are checked. Accepted types are JPEG, PNG, and WebP, up to 4 MB.

Dashboard fallback:

1. Storage → New bucket → name `complaint-images`.
2. Turn **Public bucket** on.
3. Set the file size limit to 4 MB and allow `image/jpeg`, `image/png`, and `image/webp`.
4. Add a `SELECT` policy for `public` where `bucket_id = 'complaint-images'`.
5. Do not add a public upload policy. The API uploads with the service role.

## 6. Authentication setup

1. In Supabase, open **Authentication → Providers** and enable Email.
2. For a hackathon demo, turn off **Confirm email** under Authentication → Sign In / Providers → Email so new citizens can sign in immediately. If you leave confirmation on, the register page tells the person to check their email.
3. New signups become `citizen` through a database trigger. The registration form cannot choose `admin`.
4. Create demo users with the seed script instead of hardcoding passwords:

```bash
# in .env, choose passwords of at least 8 characters
DEMO_CITIZEN_PASSWORD=choose-a-password
DEMO_ADMIN_PASSWORD=choose-another-password
DEMO_OFFICER_PASSWORD=optional-officer-password
npm run seed
```

The script prints the emails and does not print the passwords.

| Role | Email |
| --- | --- |
| Citizen | asha.nayak@civiceye.demo |
| Administrator | admin@civiceye.demo |
| Officers | rakesh.mohanty@civiceye.demo, meera.das@civiceye.demo, suresh.behera@civiceye.demo, lata.panda@civiceye.demo |

Officers are assignment records. They do not get the admin desk. Set `DEMO_OFFICER_PASSWORD` if you want the sample complaints assigned to them.

The seed inserts 22 complaints around Patia, Jaydev Vihar, Saheed Nagar, Khandagiri, Rasulgarh, and Chandrasekharpur. Running it again skips reference numbers that already exist.

## 7. Gemini API key

1. Open [Google AI Studio](https://aistudio.google.com/) and create an API key.
2. Add it only on the server:

```bash
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.5-flash
```

The browser never receives this key. Image analysis, summaries, resolution comparison, and optional embeddings run in `/api/ai/*`.

If the key is missing, those routes return **AI unavailable** and the report form switches to manual entry. The app does not fill in a pretend classification.

AI routes are limited to 10 requests per 10 minutes per signed-in user. On Vercel that counter lives in each serverless instance, so it is a best-effort guard, not a global quota.

Duplicate detection prefers Gemini embeddings and falls back to text and distance similarity. A score of 0.65 or higher is flagged for an administrator. Complaints are never discarded automatically.

## 8. Local development

```bash
npm run dev
```

This starts Vite at [http://localhost:5173](http://localhost:5173) and the API at `http://127.0.0.1:3001`. Vite proxies `/api` to that process.

Other commands:

```bash
npm run typecheck
npm run build
npm run seed
```

Demo mode, with empty Supabase variables:

1. Open the site. The amber banner says sample data is not saved.
2. Sign in → **Preview as citizen** or **Preview as admin**.
3. Report an issue, upload a photo, and choose **Analyse photo**. The API says Gemini is not configured. Fill the form manually and submit. The API says the database is not configured. The sample list does not change.
4. As admin, open Overview, the queue, the map, and a complaint. Assignment and status buttons call the API and show the same database error.

## 9. GitHub repository

Create the git repository **inside `ai-civiceye`**, not in the parent folder.

```bash
cd ai-civiceye
git init
git add .
git commit -m "Initial AI CivicEye implementation"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY
git push -u origin main
```

`.env` is gitignored. Do not commit the service role key or the Gemini key.

## 10. Vercel deployment

1. Import the GitHub repository in Vercel.
2. If the repository root is this folder, leave the project root as `.`. If you pushed a parent folder, set the root directory to `ai-civiceye`.
3. Framework preset can stay unset. [vercel.json](vercel.json) builds Vite into `dist` and rewrites non-API paths to `index.html`.
4. Files in `api/` become serverless functions. Dynamic complaint routes use `api/complaints/[id].ts`.
5. Add the environment variables from the next section, then deploy.

`VITE_` values are baked in at build time. Set them before the first production build, and redeploy after changing them.

## 11. Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser and build | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser and build | Supabase anon key, protected by RLS |
| `SUPABASE_URL` | Server | Same project URL for the API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin database and storage writes after the API checks the user |
| `GEMINI_API_KEY` | Server only | Gemini vision, summary, and embeddings |
| `GEMINI_MODEL` | Server only | Defaults to `gemini-2.5-flash` |
| `DEMO_CITIZEN_PASSWORD` | Seed script only | Password for the demo citizen |
| `DEMO_ADMIN_PASSWORD` | Seed script only | Password for the demo administrator |
| `DEMO_OFFICER_PASSWORD` | Seed script only | Optional password shared by the four demo officers |

Never put `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in a `VITE_` variable. The health check lists the names of missing server variables, not their values.

## 12. Production testing

After deploy:

1. Open `/api/health`. `services.database` and `services.ai` should be true, and `demoMode` should be false.
2. Register a citizen, submit a complaint with a real photo, and confirm the row in Supabase and the file in `complaint-images`.
3. Sign in as `admin@civiceye.demo` and confirm the new complaint is visible, filterable, and on the map.
4. Sign in as the citizen again and confirm another citizen's complaint URL returns "You can only open your own complaints."
5. Assign a department, change priority, add an internal remark, upload a repair photo, and run the comparison. The status should stay unchanged until you set it yourself, with a resolution note.
6. Call an admin analytics URL without a token and confirm it asks you to sign in.

## Manual setup this repository cannot do

- Create the Supabase project and copy its URL, anon key, and service role key.
- Run `supabase/migrations/001_init.sql` in the SQL editor.
- Confirm the `complaint-images` bucket exists and is public-read.
- Decide whether email confirmation is off for the demo.
- Create a Gemini API key and store it as `GEMINI_API_KEY`.
- Choose demo passwords and run `npm run seed`.
- Create the GitHub repository and the Vercel project, then set the environment variables there.

## API

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/health` | Public |
| GET | `/api/geocode?lat=&lng=` | Signed in |
| POST | `/api/ai/analyse-image` | Gemini key; signed in when the database is configured |
| POST | `/api/ai/detect-duplicates` | Owner or administrator |
| POST | `/api/ai/generate-summary` | Administrator |
| POST | `/api/ai/verify-resolution` | Administrator |
| GET, POST | `/api/complaints` | Signed in; citizens only see their own |
| GET, PATCH | `/api/complaints/:id` | Owner or administrator; updates require an administrator |
| POST | `/api/complaints/:id/assign` | Administrator |
| POST | `/api/complaints/:id/update-status` | Administrator |
| GET | `/api/analytics/overview` | Administrator |
| GET | `/api/analytics/categories` | Administrator |
| GET | `/api/analytics/trends` | Administrator |
| GET | `/api/analytics/departments` | Administrator |

Address lookup uses OpenStreetMap Nominatim with a named User-Agent. Submitting a complaint still works if that lookup fails.
