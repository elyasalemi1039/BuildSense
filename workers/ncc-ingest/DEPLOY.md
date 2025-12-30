# Cloudflare Worker Deployment Guide

This guide walks you through deploying the NCC ingest worker to Cloudflare.

## Prerequisites

1. A Cloudflare account (free tier works)
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

## Step 2: Update `wrangler.toml` with your Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Copy your **Account ID** from the URL: `dash.cloudflare.com/[ACCOUNT_ID]`
3. Open `wrangler.toml` and replace `YOUR_ACCOUNT_ID` with your actual account ID:

```toml
account_id = "abc123def456..."  # Your actual account ID
```

---

## Step 3: Create the Cloudflare Queue

```bash
npx wrangler queues create ncc-ingest
```

This creates a queue named `ncc-ingest` that the worker will consume from.

---

## Step 4: Verify R2 Bucket Exists

Make sure your R2 bucket `buildsense-files` exists:

```bash
npx wrangler r2 bucket list
```

If it doesn't exist, create it:

```bash
npx wrangler r2 bucket create buildsense-files
```

---

## Step 5: Set Worker Secrets

Generate a random token for the enqueue endpoint:

```bash
# Generate a random token (copy this for later)
openssl rand -hex 32
```

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

**Important:** Save the `ENQUEUE_TOKEN` value — you'll need it for Vercel env vars.

---

## Step 6: Deploy the Worker

```bash
npx wrangler deploy
```

After deployment, you'll see output like:

```
Published ncc-ingest (X.XX sec)
  https://ncc-ingest.your-subdomain.workers.dev
```

**Copy this URL** — you'll need it for Vercel.

---

## Step 7: Set Vercel Environment Variables

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

Add these two variables:

1. **`CLOUDFLARE_NCC_INGEST_ENQUEUE_URL`**
   - Value: `https://ncc-ingest.your-subdomain.workers.dev/enqueue`
   - (Use the URL from Step 6, add `/enqueue` at the end)

2. **`CLOUDFLARE_NCC_INGEST_ENQUEUE_TOKEN`**
   - Value: The same random hex token you set in Step 5 as `ENQUEUE_TOKEN`

Then **redeploy** your Vercel app (or it will auto-deploy on next push).

---

## Step 8: Test the Pipeline

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

### Manually Trigger a Test (optional)

You can test the enqueue endpoint with curl:

```bash
curl -X POST https://ncc-ingest.your-subdomain.workers.dev/enqueue \
  -H "Authorization: Bearer YOUR_ENQUEUE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ingestRunId":"test-run-id"}'
```

If it works, you'll see: `{"success":true,"message":"Ingest job enqueued"}`

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

