# 🎬 ClipMint — AI Content Repurposer

> Upload one long video → get 10+ platform-ready clips with professional animated captions.

## Architecture

```
13-ClipMint/
├── remotion-captions/       # Remotion subtitle rendering engine (9 styles)
│   ├── src/
│   │   ├── CaptionedClip.tsx   # Main composition with 9 caption styles
│   │   ├── Root.tsx            # Composition registrations
│   │   └── utils/
│   │       └── parseCaptions.ts  # SRT parser
│   └── public/
│       └── sample.srt          # Test SRT file
├── dashboard/               # Next.js 14 dashboard
│   ├── src/app/
│   │   ├── page.tsx            # Landing page (hero, pricing, styles)
│   │   └── dashboard/
│   │       ├── layout.tsx      # Sidebar navigation
│   │       ├── page.tsx        # Jobs list
│   │       ├── new/page.tsx    # Upload form
│   │       ├── [jobId]/page.tsx # Job detail + clips
│   │       ├── analytics/      # Usage analytics
│   │       ├── api-keys/       # API key management
│   │       └── settings/       # User settings
│   └── src/lib/
│       ├── supabase.ts         # Supabase client
│       └── types.ts            # Shared TypeScript types
├── api-gateway/             # Cloudflare Worker API
│   ├── src/index.ts            # Main router (5 endpoints)
│   └── wrangler.toml           # Worker config
├── supabase/
│   └── schema.sql              # Database schema (4 tables + RLS)
├── .github/workflows/
│   ├── process-video.yml       # Main pipeline (11 steps)
│   └── health-check.yml       # Daily cron health check
└── README.md
```

## Quick Start

### 1. Remotion Caption Engine
```bash
cd remotion-captions
npm install
npm start          # Opens Remotion Studio at localhost:3000
npm run build      # Renders a test clip to out/clip.mp4
```

### 2. Dashboard
```bash
cd dashboard
npm install
npm run dev        # Opens Next.js at localhost:3000
```

### 3. API Gateway
```bash
cd api-gateway
npm install
npx wrangler dev   # Local dev server
npx wrangler deploy # Deploy to Cloudflare
```

### 4. Database
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Add your Supabase URL and keys to `dashboard/.env.local`

## Caption Styles (9 Available)

| Style | Effect |
|-------|--------|
| **Hormozi** | Word-by-word green highlight with scale pop |
| **Bounce** | Spring physics bounce-in animation |
| **Fade** | Smooth fade in/out |
| **Glow** | Pulsing neon glow effect |
| **Typewriter** | Character-by-character typing with cursor |
| **Glitch** | RGB split glitch effect |
| **Neon** | Flickering neon sign with layered glow |
| **Colorful** | Rainbow-colored words with staggered entrance |
| **Minimal** | Frosted glass pill with subtle slide-up |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/jobs` | Submit a new video for processing |
| `GET` | `/api/v1/jobs` | List your jobs |
| `GET` | `/api/v1/jobs/:id` | Get job details |
| `GET` | `/api/v1/jobs/:id/clips` | Get clips for a job |
| `GET` | `/api/v1/health` | Health check |

## Tech Stack

- **Remotion** — React-based video rendering
- **Next.js 14** — Dashboard with Tailwind CSS
- **Cloudflare Workers** — API gateway
- **Supabase** — Auth + PostgreSQL database
- **GitHub Actions** — Video processing pipeline
- **Groq** — LLaMA 3.3 for AI analysis + Whisper transcription
- **Google Drive** — Video storage
- **FFmpeg** — Video processing

## Pricing (INR)

| Plan | Price | Clips/Month | Videos/Month |
|------|-------|-------------|--------------|
| Free | ₹0 | 5 | 1 |
| Creator | ₹499/mo | 50 | 5 |
| Pro | ₹1,499/mo | 200 | 20 |
| Agency | ₹4,999/mo | Unlimited | Unlimited |
