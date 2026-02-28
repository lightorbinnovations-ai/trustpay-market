# TrustPay Markets — Migration & Setup Guide

Complete guide to set up TrustPay Markets on a fresh Supabase project and deploy it.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note down:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **Anon/Public Key** (Settings → API → `anon` key)
   - **Service Role Key** (Settings → API → `service_role` key — **keep secret**)
   - **Project ID** (from the URL or Settings → General)

---

## 2. Run the Database Migration

1. Go to Supabase Dashboard → **SQL Editor**
2. Open and run the entire contents of `docs/SUPABASE_MIGRATION.sql`
3. This creates all 8 tables, RLS policies, realtime subscriptions, and the storage bucket.

---

## 3. Configure Environment Variables

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
```

---

## 4. Set Up Edge Function Secrets

Go to Supabase Dashboard → **Settings → Edge Functions → Secrets** and add:

| Secret Name | Where to Get It |
|---|---|
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) on Telegram — create or manage your bot |
| `SUPABASE_URL` | Same as `VITE_SUPABASE_URL` above |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → `service_role` key |
| `SUPABASE_ANON_KEY` | Settings → API → `anon` key |

> **Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-provided in Supabase-hosted edge functions, but you should verify they exist.

---

## 5. Deploy Edge Functions

The project has 7 edge functions in `supabase/functions/`:

| Function | Purpose |
|---|---|
| `telegram-webhook` | Main Telegram bot webhook — handles commands, payments, escrow |
| `pay-ad` | Sends Telegram Stars invoice for sponsored ads |
| `boost-listing` | Sends Telegram Stars invoice for listing boosts |
| `verify-seller` | Sends Telegram Stars invoice for verified badge (90 Stars / 30 days) |
| `check-expired-boosts` | Cron job to reset expired boosts |
| `send-push` | Sends push notification messages via Telegram Bot API |
| `listing-og` | Generates Open Graph metadata for listing deep links |

### Deploy with Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy all functions
supabase functions deploy telegram-webhook --no-verify-jwt
supabase functions deploy pay-ad --no-verify-jwt
supabase functions deploy boost-listing --no-verify-jwt
supabase functions deploy verify-seller --no-verify-jwt
supabase functions deploy check-expired-boosts --no-verify-jwt
supabase functions deploy send-push --no-verify-jwt
supabase functions deploy listing-og --no-verify-jwt
```

> **Important:** All functions use `--no-verify-jwt` because auth is handled via Telegram, not Supabase Auth.

---

## 6. Set Up Telegram Bot Webhook

After deploying the `telegram-webhook` function, register it with Telegram:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_PROJECT_ID.supabase.co/functions/v1/telegram-webhook"}'
```

---

## 7. Set Up Cron Job for Expired Boosts

In Supabase Dashboard → **SQL Editor**, run:

```sql
-- Check expired boosts every hour
SELECT cron.schedule(
  'check-expired-boosts',
  '0 * * * *',  -- every hour
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/check-expired-boosts',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

> Replace `YOUR_PROJECT_ID` and `YOUR_ANON_KEY` with your actual values.

---

## 8. Storage Bucket Verification

The migration script creates a **public** `listing-images` bucket. Verify it exists:

1. Go to Supabase Dashboard → **Storage**
2. You should see `listing-images` listed as public
3. File structure inside:
   - `listings/{listing_id}/{timestamp}-{random}.jpg` — listing photos (max 3 per listing, compressed to ≤100KB)
   - `ads/{ad_id}/image.{ext}` — ad images
   - `ads/{ad_id}/video.{ext}` — ad videos

---

## 9. Deploy the Frontend

```bash
# Install dependencies
npm install

# Build
npm run build

# The built files are in the `dist/` folder
# Deploy to any static hosting (Vercel, Netlify, Cloudflare Pages, etc.)
```

### For Telegram Mini App:
1. Set the Web App URL in [@BotFather](https://t.me/BotFather) → your bot → Bot Settings → Menu Button / Web App
2. Point it to your deployed URL

---

## 10. Admin Access

Admin is determined by Telegram username. Edit `src/hooks/useAdmin.ts`:

```typescript
const ADMIN_USERNAMES = ["your_telegram_username"];
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────┐
│              Telegram Mini App              │
│         (React + Vite + Tailwind)           │
├─────────────────────────────────────────────┤
│         Supabase (Backend)                  │
│  ┌─────────┬──────────┬──────────────────┐  │
│  │ Tables  │ Storage  │ Edge Functions   │  │
│  │ (8)     │ (1 bucket)│ (7 functions)   │  │
│  └─────────┴──────────┴──────────────────┘  │
├─────────────────────────────────────────────┤
│         Telegram Bot API                    │
│  (Payments, Webhooks, Notifications)        │
└─────────────────────────────────────────────┘
```

### Revenue Streams (Telegram Stars):
- **Sponsored Ads**: 1-30 days, ~14 Stars/day with volume discount
- **Listing Boosts**: 1-30 days, ~10 Stars/day with volume discount
- **Verified Badge**: 90 Stars for 30 days

### Key Features:
- Telegram-only auth (no email/password)
- Escrow payment system via TrustPay9jaBot
- Image compression to ≤100KB, max 3 per listing
- Location-based listing discovery
- Real-time notification feed
- Admin dashboard with full CRUD
- Weighted random ad rotation across pages

---

## Secrets Checklist

| Secret | Required | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | From BotFather |
| `SUPABASE_URL` | ✅ | Auto-provided in Supabase edge functions |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Auto-provided in Supabase edge functions |
| `SUPABASE_ANON_KEY` | ✅ | Auto-provided in Supabase edge functions |
| `VITE_SUPABASE_URL` | ✅ | Frontend .env |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Frontend .env (anon key) |
| `VITE_SUPABASE_PROJECT_ID` | ✅ | Frontend .env |
