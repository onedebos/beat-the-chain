# Supabase Setup Instructions

Follow these steps to set up Supabase for your Beat the Chain game:

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `beat-the-chain` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for the project to be created

## 2. Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll see two important values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (a long JWT token)

## 3. Set Up Environment Variables

1. In your project root, create a file named `.env.local`
2. Add these lines (replace with your actual values):

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Example:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI4MCwiZXhwIjoxOTU0NTQzMjgwfQ.example
```

⚠️ **Important**: Never commit `.env.local` to git! It's already in `.gitignore`.

## 4. Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the entire contents of `supabase-setup.sql`
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

## 5. Verify the Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see a table called `game_results`
3. The table should have these columns:
   - `id` (bigint, primary key)
   - `player_name` (text)
   - `score` (numeric)
   - `lps` (numeric)
   - `accuracy` (numeric)
   - `rank` (text)
   - `time` (numeric)
   - `ms_per_letter` (numeric)
   - `game_mode` (integer)
   - `created_at` (timestamptz)

## 6. Test the Integration

1. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```

2. Play a game and complete it
3. Check your Supabase dashboard → **Table Editor** → `game_results`
4. You should see a new row with your game result!

5. Visit `/leaderboard` in your app
6. You should see your score on the leaderboard

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env.local` exists in the project root
- Check that variable names are exactly: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart your dev server after creating/updating `.env.local`

### "relation 'game_results' does not exist" error
- Make sure you ran the SQL script in step 4
- Check the SQL Editor for any error messages

### Scores not appearing in leaderboard
- Check the browser console for errors
- Verify the data was saved in Supabase Table Editor
- Make sure you're viewing the correct game mode (15/30/60 words)

### Row Level Security (RLS) errors
- The SQL script sets up RLS policies automatically
- If you see permission errors, check that the policies were created correctly in **Authentication** → **Policies**

## Next Steps

Once everything is working:
- ✅ Game results are automatically saved
- ✅ Leaderboard shows real data
- ✅ You can filter by game mode (15/30/60 words)

### Optional Enhancements:
- Add pagination for leaderboards with many entries
- Add user authentication (so players can track their personal bests)
- Add real-time leaderboard updates using Supabase Realtime
- Add analytics/dashboard to see game statistics

## Security Notes

- The `anon` key is safe to use in client-side code (it's public)
- Row Level Security (RLS) is enabled to protect your data
- Only SELECT and INSERT operations are allowed (no updates/deletes)
- For production, consider adding rate limiting to prevent spam

