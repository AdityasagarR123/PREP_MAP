# PrepMap — Frontend

The web app for **PrepMap**, a placement and interview prep site for students (especially in India).
Students pick a target company and practise questions matched to that company's public hiring process,
or paste any question to have an ML model predict its subject, difficulty and the companies it is recommended for.

- **Stack:** Next.js 15 (App Router) + TypeScript + plain CSS. No UI or 3D libraries — the rotating company
  globe is a hand-written `<canvas>` renderer and the other 3D touches are CSS transforms.
- **Design:** light SaaS look — off-white canvas, white cards with soft shadows, Instrument Sans (via
  `next/font`) in light weights, and a deep indigo accent (`#372AAC`). All tokens live at the top of
  `app/globals.css`.
- **Backend:** the FastAPI app in [`../backend`](../backend), reached only over HTTP via `NEXT_PUBLIC_API_URL`.
- **Progress:** stored only in the browser (`localStorage`). No login, no user database.

> Company labels mean "recommended for", based on each company's public hiring process — not a record of
> questions the company asked.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Hero with a floating 3D widget stack (live practice set, analyser example, your progress), company marquee, how it works, feature showcase, interactive 3D company globe, stats, FAQ |
| `/companies` | All 19 companies, filter by category, search by name |
| `/company/[name]` | Hiring profile, question counts, shareable practice set (filters + seed in the URL) |
| `/company/[name]/practice` | One-question-at-a-time practice mode with an end-of-set summary |
| `/analyse` | Paste a question → predicted subject, difficulty and recommended companies |
| `/question/[id]` | One question, its subject/difficulty and every company it is recommended for |
| `/progress` | Target company, practised / revise-later totals, breakdowns, reset |
| `/about` | Data, company mapping, model scores, limitations, links |

## Project layout

```
frontend/
├── app/                    # routes (App Router); each page.tsx sets its title + meta description
│   ├── layout.tsx          # header, cold-start banner, footer
│   ├── globals.css         # design tokens + all styles
│   ├── companies/  company/[name]/  company/[name]/practice/
│   ├── analyse/  question/[id]/  progress/  about/
│   ├── error.tsx  not-found.tsx  icon.svg
├── components/             # Header, Footer, HeroStack (3D widgets), Orb (3D globe), Tilt, Icons, Badges, States, ...
├── lib/
│   ├── api.ts              # the ONLY place that talks to the backend (typed, cached, cold-start aware)
│   ├── progress.ts         # localStorage progress store
│   ├── useApi.ts           # small data-fetching hook
│   ├── params.ts  format.ts  links.ts
└── .env.example
```

## Run locally

1. Start the backend (see [`../backend/README.md`](../backend/README.md)), or use your deployed Render URL.
2. Install and configure:

   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   ```

   Edit `.env.local` so `NEXT_PUBLIC_API_URL` points at the backend, with no trailing slash:

   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. Run the dev server and open <http://localhost:3000>:

   ```bash
   npm run dev
   ```

Other scripts: `npm run build` (production build), `npm start` (serve the build), `npm run typecheck`.

`NEXT_PUBLIC_*` variables are baked in at build time, so restart `npm run dev` (or rebuild) after changing them.

## Deploy on Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New… → Project** and import `AdityasagarR123/PREP_MAP`.
3. **Root Directory:** click *Edit* and choose `frontend`. Vercel detects Next.js automatically
   (build `next build`, output `.next` — leave the defaults).
4. **Environment Variables:** add
   `NEXT_PUBLIC_API_URL` = your Render backend URL, e.g. `https://prep-map.onrender.com` (no trailing slash).
5. Click **Deploy**. Live site: **https://prepmap-three.vercel.app**
6. Open the Vercel URL. The first visit after the backend has been idle shows
   "Waking up the server…" for up to a minute while Render's free instance starts.

**No CORS setup needed.** The browser never calls Render directly: it calls `/backend/*` on the Vercel site,
and `next.config.ts` proxies those requests to `NEXT_PUBLIC_API_URL`. The backend's `ALLOWED_ORIGINS`
can be left as it is.

If you change `NEXT_PUBLIC_API_URL` later, redeploy on Vercel (Deployments → ⋯ → Redeploy) so the new value is built in.

## Design & motion

- **3D touches:** the hero widget stack and company cards tilt toward the pointer, the globe on the home
  page can be dragged and clicked, the loader is a spinning CSS cube, and practice-mode cards flip in.
- **Reduced motion:** all animation is switched off for visitors with `prefers-reduced-motion` set.
- **Accessibility:** every form control has a label, everything works by keyboard (practice mode adds
  ← / → / P / R shortcuts), and the decorative canvas is hidden from screen readers — the company picker
  next to it is the accessible path.

## Notes

- **API proxy:** `lib/api.ts` sends every request to `/backend/...`; `next.config.ts` rewrites that to the
  real backend. This works the same locally (`npm run dev`) and on Vercel.

- **Cold starts:** `lib/api.ts` calls `/health` first and retries with backoff (about a minute in total) before
  showing an error with a Retry button. `/companies`, `/subjects` and company details are cached for the
  browser session.
- **Shareable practice sets:** filters and the random `seed` live in the URL, so the same link always gives the
  same questions.
- **No answers:** the dataset has no answers, so the app never shows or invents them.
- **Interview experience form:** set `LINKS.experienceForm` in `lib/links.ts` to your Google Form URL to enable
  the button on the About page.
