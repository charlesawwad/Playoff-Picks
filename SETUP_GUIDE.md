# 🏆 Playoff Picks — Setup Guide
## Complete step-by-step for non-technical users

This guide takes you from zero to a live, working website. No coding experience needed.
Estimated time: **45–60 minutes**.

---

## What you'll set up
1. **Supabase** — your database and user login system (free)
2. **Vercel** — the service that hosts your website (free)
3. **GitHub** — where your code lives (free)

All three have free tiers that comfortably handle hundreds of users.

---

## PART 1 — Set up Supabase (your database)

### Step 1: Create a Supabase account
1. Go to **https://supabase.com**
2. Click **Start your project**
3. Sign up with GitHub or email
4. Click **New project**
5. Choose a name (e.g. "playoff-picks"), pick a region close to you, set a database password, click **Create project**
6. Wait 1–2 minutes for your project to be ready

### Step 2: Run the database schema
1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase_schema.sql` from the code folder you received
4. Copy the entire contents and paste it into the SQL editor
5. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
6. You should see "Success. No rows returned" — that's correct!

### Step 3: Get your API keys
1. In Supabase, click **Project Settings** (gear icon) → **API**
2. You'll see two values you need:
   - **Project URL** — looks like `https://abcdefghij.supabase.co`
   - **anon public** key — a very long string of letters/numbers
3. Keep this tab open — you'll need these in Part 2

### Step 4: Enable email confirmations (optional but recommended)
1. In Supabase, go to **Authentication** → **Providers** → **Email**
2. If you want users to confirm their email, leave "Enable email confirmations" ON
3. For testing with just 4 friends, you can turn it OFF for simplicity

---

## PART 2 — Configure the code

### Step 5: Edit the Supabase connection file
1. Open the file `src/lib/supabase.js` in any text editor (Notepad on Windows, TextEdit on Mac)
2. Replace `YOUR_SUPABASE_URL` with your Project URL from Step 3
3. Replace `YOUR_SUPABASE_ANON_KEY` with your anon public key from Step 3
4. Save the file

It should look like:
```js
const SUPABASE_URL = 'https://abcdefghij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## PART 3 — Put the code on GitHub

### Step 6: Create a GitHub account
1. Go to **https://github.com** and sign up (free)

### Step 7: Create a new repository
1. Click the **+** button at the top right → **New repository**
2. Name it `playoff-picks`
3. Leave it **Public** (required for free Vercel hosting)
4. Click **Create repository**

### Step 8: Upload the code
1. On your new repository page, click **uploading an existing file**
2. Drag and drop ALL the files and folders from your `playoff-picks` folder
   - Make sure to include: `src/`, `public/`, `index.html`, `package.json`, `vite.config.js`
3. Scroll down, click **Commit changes**

---

## PART 4 — Deploy to Vercel

### Step 9: Create a Vercel account
1. Go to **https://vercel.com**
2. Click **Sign Up** → choose **Continue with GitHub**
3. Authorize Vercel to access your GitHub

### Step 10: Deploy your site
1. On your Vercel dashboard, click **Add New** → **Project**
2. Find your `playoff-picks` repository and click **Import**
3. Vercel will auto-detect it as a Vite project — settings should be correct
4. Click **Deploy**
5. Wait about 1 minute

🎉 **Your site is now live!** Vercel gives you a URL like `https://playoff-picks-xyz.vercel.app`

---

## PART 5 — First-time setup in the app

### Step 11: Create your admin account
1. Go to your new website URL
2. Click **Sign Up** and create your account
3. Go back to Supabase → **Table Editor** → **profiles** table
4. Find your row (your username) and click the pencil/edit icon
5. Change `is_admin` from `false` to `true`
6. Save — you now have admin access

### Step 12: Add teams
1. On the website, click the **Admin** link in the navbar (only visible to you)
2. Go to the **Teams** tab
3. Add all 30 NBA teams, 32 NFL teams, 32 NHL teams, 30 MLB teams
   - You only need to add teams for sports you're running right now
   - The schema SQL doesn't pre-load teams because rosters/names can change

### Step 13: Create a season
1. In Admin → **Seasons** tab
2. Fill in the season details:
   - Sport: NBA (or whichever you're starting with)
   - Name: e.g. "2024-25 NBA Season"
   - Regular Season Deadline: the night before the season starts
   - Playoff Deadline: the night before the playoffs start
3. Click **Create Season**

### Step 14: Invite your friends
1. Send them your website URL
2. They sign up, you're all set!
3. To add them to a league: you create a league in the Leagues section, copy the invite code, send it to them

---

## PART 6 — Running the game each season

### When results come in (during/after playoffs):
1. Go to Admin → **Results** tab
2. Select the season
3. For each team, select their actual finish from the dropdown
4. Click **Save All Results**
5. The leaderboard automatically calculates everyone's scores

### Updating season status:
- Keep the status updated so the app shows the right information
- `upcoming` → before the season starts
- `regular_season` → season is underway (regular season picks are locked, playoff picks open)
- `playoffs` → playoffs started (both deadlines now passed)
- `complete` → season over, final scores locked in

---

## Troubleshooting

**"Error: invalid API key"**
→ Double-check your Supabase URL and anon key in `src/lib/supabase.js`

**Users can't sign up / email not arriving**
→ In Supabase → Authentication → Email, try turning off "Enable email confirmations" for testing

**Admin link not showing**
→ Make sure you set `is_admin = true` in the profiles table for your user

**Scores not calculating**
→ Make sure results have been entered for the season in the Admin panel

---

## Optional upgrades (for later)

Once you're comfortable, these are worth adding:
- **Custom domain**: In Vercel → your project → Settings → Domains (costs ~$12/year for a domain)
- **Automatic sports results**: Sports data APIs like Sportradar or MySportsFeeds can feed results automatically — worth setting up once the manual process feels tedious
- **Email notifications**: Supabase has built-in email sending you can use to notify players of deadlines

---

## File structure reference

```
playoff-picks/
├── index.html                  ← App entry point
├── package.json                ← Dependencies list
├── vite.config.js              ← Build config
├── supabase_schema.sql         ← Run this in Supabase SQL Editor
└── src/
    ├── main.jsx                ← React entry point
    ├── App.jsx                 ← Main app + navigation
    ├── index.css               ← All styles
    ├── lib/
    │   ├── supabase.js         ← ⚠️ PUT YOUR KEYS HERE
    │   └── scoring.js          ← Scoring engine (no edits needed)
    ├── pages/
    │   ├── AuthPage.jsx        ← Login / signup
    │   ├── Dashboard.jsx       ← Home screen
    │   ├── PicksPage.jsx       ← Submit picks
    │   ├── LeaderboardPage.jsx ← Scores & rankings
    │   ├── LeaguePage.jsx      ← Create / join leagues
    │   └── AdminPage.jsx       ← Admin tools
    └── components/
        └── Navbar.jsx          ← Top navigation bar
```
