# FB Ads Library Dashboard

A clean web dashboard to search and analyze Facebook Ads Library data.

## Features
- Search ads by keyword, country, status, and media type
- Metric cards: total ads, active ads, advertisers, platforms
- Sort by date or page name
- Pagination
- Export results to CSV
- Token saved in browser localStorage

## Files
```
ads-dashboard/
├── index.html      ← Main page
├── style.css       ← All styles
├── app.js          ← All logic
├── netlify.toml    ← Netlify config
└── README.md
```

## Deploy to Netlify (Free — Recommended)

1. Go to https://netlify.com and sign up (free)
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop the entire `ads-dashboard` folder
4. Your site is live in seconds! You'll get a URL like `https://your-site.netlify.app`

## Deploy to Vercel (Alternative)

1. Go to https://vercel.com and sign up (free)
2. Install Vercel CLI: `npm i -g vercel`
3. In the `ads-dashboard` folder, run: `vercel`
4. Follow the prompts — site goes live instantly

## Deploy to GitHub Pages

1. Create a new GitHub repo
2. Upload all files to the repo
3. Go to Settings → Pages → Source: main branch → root
4. Your site is live at `https://yourusername.github.io/repo-name`

## Usage

1. Open the dashboard URL in your browser
2. Paste your Facebook Access Token in the sidebar → click Save
3. Enter a keyword, pick a country/status/media filter
4. Click **Search Ads**
5. Use **Export CSV** to download results

## Get a Facebook Access Token

1. Go to https://developers.facebook.com/tools/explorer
2. Select your App (or create one at developers.facebook.com)
3. Click **Generate Access Token**
4. Copy and paste it into the dashboard sidebar

> Note: User tokens expire. For a permanent token, create a System User
> in Facebook Business Manager and generate a long-lived token.

## API Reference
This app uses the Facebook Ads Library API:
https://www.facebook.com/ads/library/api/
