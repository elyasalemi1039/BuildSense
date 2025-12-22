# BuildSense Database Setup

This directory contains the Supabase database migrations for BuildSense.

## Quick Setup

### 1. Run the SQL Migration in Supabase

Go to your Supabase project dashboard:
1. Navigate to **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `migrations/20250101000000_initial_schema.sql`
4. Click **Run** to execute

This will create:
- All tables (profiles, projects, checklists, inspections, etc.)
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for automatic timestamps
- Automatic profile creation on user signup

### 2. Verify the Setup

After running the migration, verify in the Supabase dashboard:

**Table Editor** should show:
- profiles
- projects
- checklists
- checklist_items
- inspections
- ncc_bookmarks
- ai_conversations
- team_members

**Authentication** → **Policies** should show RLS policies for each table.

## Database Structure

### Core Tables

#### **profiles**
Extends `auth.users` with app-specific user data
- Links to Supabase auth system
- Stores company, role, subscription tier
- Automatically created when user signs up

#### **projects**
Building project information
- Location data (address, coordinates, state)
- Building classification (class, type)
- Zone data (climate, wind, bushfire)
- Construction stage and status

#### **checklists**
Stage-specific compliance checklists
- Linked to projects
- Tracks completion status
- Timestamped for audit trail

#### **checklist_items**
Individual compliance checks
- Links to NCC clauses
- Photo evidence (R2 URLs)
- Compliance status tracking
- Geo-tagged inspections

#### **inspections**
General inspection records
- Not tied to specific checklists
- Photo and document storage
- Inspector information
- Pass/fail status

### Supporting Tables

- **ncc_bookmarks**: User-saved NCC clauses
- **ai_conversations**: AI copilot conversation history
- **team_members**: Multi-user project access (future)

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Projects are isolated by user_id
- Checklists/inspections are accessible only to project owners

### Authentication

The database integrates with Supabase Auth:
- Email/password authentication
- Automatic profile creation via trigger
- Session management via middleware

## Generating TypeScript Types

To regenerate TypeScript types from your Supabase schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

Replace `YOUR_PROJECT_ID` with your actual Supabase project ID (found in project settings).

## Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Local Development (Optional)

If you want to use Supabase locally:

```bash
npx supabase init
npx supabase start
npx supabase db reset
```

## Notes

- The migration uses UUID v4 for all primary keys
- Timestamps use `TIMESTAMPTZ` for timezone awareness
- Arrays are used for storing multiple URLs (photos, documents)
- JSONB is used for flexible data (geo_location)


