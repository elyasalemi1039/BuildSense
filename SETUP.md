# BuildSense - Setup Guide

## 🗄️ Database Setup

### Step 1: Run the SQL Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open the file: `supabase/migrations/20250101000000_initial_schema.sql`
6. Copy the entire contents and paste into the SQL editor
7. Click **Run** (or press Ctrl+Enter)

You should see: "Success. No rows returned"

### Step 2: Verify Tables Were Created

1. Go to **Table Editor** in the left sidebar
2. You should see all these tables:
   - profiles
   - projects
   - checklists
   - checklist_items
   - inspections
   - ncc_bookmarks
   - ai_conversations
   - team_members

### Step 3: Check RLS Policies

1. Go to **Authentication** → **Policies**
2. Each table should have multiple policies (e.g., "Users can view own projects")

## 🔐 Authentication Setup

### Email Authentication is Already Enabled

By default, Supabase has email/password auth enabled. To verify:

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled

### Optional: Enable Email Confirmations

If you want users to verify their email:

1. **Authentication** → **Settings**
2. Enable **"Confirm email"**
3. Configure email templates if desired

For development, you can keep this disabled.

## 🚀 What Works Now

### Authentication
- ✅ `/sign-up` - Create new accounts
- ✅ `/login` - Sign in to existing accounts
- ✅ Protected routes - `/dashboard` and `/projects` require login
- ✅ Auto-redirect - Logged in users redirected away from auth pages
- ✅ Session management - Handled by Supabase cookies

### Database Structure
All tables are ready with:
- ✅ Row Level Security (users can only see their own data)
- ✅ Automatic timestamps (created_at, updated_at)
- ✅ Automatic profile creation when users sign up
- ✅ Proper indexes for performance

## 🧪 Testing the Auth Flow

1. **Sign Up**
   - Go to `/sign-up`
   - Enter name, email, password
   - Click "Create Account"
   - Should redirect to `/dashboard`

2. **Sign Out** (add this later)
   - Currently no sign-out button in UI
   - Will add to sidebar footer

3. **Sign In**
   - Go to `/login`
   - Enter credentials
   - Should redirect to `/dashboard`

4. **Protected Routes**
   - Try visiting `/dashboard` without being logged in
   - Should redirect to `/login?redirectTo=/dashboard`

## 📊 Database Schema Overview

### Projects Table
Stores building project data with:
- Location (address, coordinates, state)
- Building classification (class, type)
- Zone data (climate, wind, bushfire)
- Construction stage and status

### Checklists & Items
Stage-specific compliance tracking:
- Link to NCC clauses
- Photo evidence storage (R2 URLs)
- Compliance status
- Geo-tagged inspections

### Inspections
General inspection records:
- Photos and documents
- Inspector info
- Pass/fail status

## 🔧 Environment Variables Required

Make sure these are set in Vercel:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Cloudflare R2 Storage (Required for NCC file uploads)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=buildsense-files
```

### Setting up Cloudflare R2

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account → **R2 Object Storage**
3. Click **Create Bucket** and name it `buildsense-files`
4. Go to **Manage R2 API Tokens** → **Create API Token**
5. Select permissions: **Object Read & Write**
6. Copy the Access Key ID and Secret Access Key
7. Your Account ID is in the URL: `dash.cloudflare.com/[ACCOUNT_ID]/r2`

**Note:** R2 is optional for local development. The app will skip file uploads when R2 is not configured.

Already added? ✅ Good to go!

## 📝 Next Steps

1. Run the SQL migration in Supabase ⬅️ **Do this first**
2. Test sign-up flow
3. Test login flow
4. Start building features (projects, checklists, etc.)

## 🆘 Troubleshooting

### "relation 'profiles' does not exist"
- You haven't run the SQL migration yet
- Run the migration file in Supabase SQL Editor

### "new row violates row-level security policy"
- The RLS policies weren't created
- Re-run the migration
- Check that policies exist in Authentication → Policies

### "Invalid login credentials"
- Check email/password are correct
- Check if user exists in Authentication → Users

### Can't access /dashboard after login
- Check browser console for errors
- Verify auth cookies are being set
- Check that middleware isn't blocking the route


