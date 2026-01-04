# Cloudflare Worker Deployment Guide

This guide walks you through deploying the NCC ingest worker to Cloudflare.

## Prerequisites

1. A Cloudflare account (Workers Paid plan - $5/month for Queues)
2. Your Supabase project URL and service role key
3. Your R2 bucket already created (`buildsense-files`)

---

## Step 1: Login to Cloudflare

```bash
cd /Users/elyasalemi/Desktop/Websites/BuildSense/workers/ncc-ingest
npx wrangler login
```

This will open a browser window to authenticate with Cloudflare.

---

## Step 2: Create the R2 Bucket

```bash
npx wrangler r2 bucket create buildsense-files
```

---

## Step 3: Create the Cloudflare Queue

```bash
npx wrangler queues create ncc-ingest
```

This creates a queue named `ncc-ingest` that the worker will consume from.

---

## Step 4: Generate and Set Worker Secrets

Generate a new random token:

```bash
openssl rand -hex 32
```

**IMPORTANT: Copy this token - you'll need it for Vercel env vars!**

Now set the secrets:

```bash
# Set Supabase URL
npx wrangler secret put SUPABASE_URL
# Paste: https://your-project.supabase.co

# Set Supabase service role key
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste: your-service-role-key (from Supabase Settings > API)

# Set enqueue token (use the random hex you generated above)
npx wrangler secret put ENQUEUE_TOKEN
# Paste: the random hex token
```

---

## Step 5: Deploy the Worker

```bash
npx wrangler deploy
```

After deployment, you'll see output like:

```
Published buildsense-ncc-ingest (X.XX sec)
  https://buildsense-ncc-ingest.your-subdomain.workers.dev
```

**Copy this URL** — you'll need it for Vercel.

---

## Step 6: Set Vercel Environment Variables

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

Add these two variables:

1. **`CLOUDFLARE_NCC_INGEST_ENQUEUE_URL`**
   - Value: `https://buildsense-ncc-ingest.your-subdomain.workers.dev/enqueue`
   - (Use the URL from Step 5, add `/enqueue` at the end)

2. **`CLOUDFLARE_NCC_INGEST_ENQUEUE_TOKEN`**
   - Value: The same random hex token you set in Step 4 as `ENQUEUE_TOKEN`

Then **redeploy** your Vercel app (or it will auto-deploy on next push).

---

## Step 7: Test the Pipeline

1. Go to your app: `https://your-app.vercel.app/admin/ncc`
2. Create a new NCC edition
3. Upload 4 ZIP files (one for each volume)
4. After upload, you should see **Ingest Runs** appear with status `queued` → `running` → `done`

---

## Troubleshooting

### Check Worker Logs

```bash
npx wrangler tail
```

This streams live logs from your worker.

### Check Queue Status

```bash
npx wrangler queues list
```

### Test the Enqueue Endpoint

```bash
curl -X POST https://buildsense-ncc-ingest.your-subdomain.workers.dev/enqueue \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"ingestRunId":"test-123"}'
```

Expected response: `{"ok":true,"ingestRunId":"test-123"}`

---

## Security Notes

⚠️ **NEVER commit secrets to git!**
- The `ENQUEUE_TOKEN` should only exist in Cloudflare Worker secrets and Vercel env vars
- Generate a new token with `openssl rand -hex 32` if you suspect it's been exposed
- Rotate secrets immediately if they appear in git history

---

## Summary of What You Need

| What | Where to Get It |
|------|----------------|
| Account ID | Cloudflare Dashboard URL |
| SUPABASE_URL | Supabase Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | Supabase Settings → API (service_role key) |
| ENQUEUE_TOKEN | Generate with `openssl rand -hex 32` |
| Worker URL | Output after `npx wrangler deploy` |

---

## Next Steps

Once deployed:
- Upload ZIPs via the admin UI
- Worker will automatically process them in the background
- Check logs with `npx wrangler tail` if you see any failures


