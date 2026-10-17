# Website Template Setup Guide

A Next.js 15 landing page template with Tailwind CSS v4 for your mobile app.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Run development server
npm run dev

# Or run on a specific port (to avoid conflicts with other projects)
npm run dev -- -p 3001
```

## Running Multiple Projects

To avoid port conflicts when running multiple apps:

```bash
# Project 1: default port
npm run dev              # http://localhost:3000

# Project 2: different port
npm run dev -- -p 3001   # http://localhost:3001

# Project 3: another port
npm run dev -- -p 3002   # http://localhost:3002
```

## Configuration

### Required Environment Variables

Edit `.env.local`:

```env
# Your app name (shown in navbar, SEO, etc.)
NEXT_PUBLIC_APP_NAME=MyAwesomeApp

# Your website URL (for SEO meta tags)
NEXT_PUBLIC_SITE_URL=https://myawesomeapp.com

# Support email (shown in legal pages)
NEXT_PUBLIC_SUPPORT_EMAIL=support@myawesomeapp.com

# App Store URLs
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/myapp/id123456789
NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.myapp

# Deep link scheme (must match your mobile app's scheme)
NEXT_PUBLIC_APP_SCHEME=myawesomeapp
```

### Optional: Supabase for Waitlist

If you want to collect waitlist emails before launch:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Create a `waitlist` table:

```sql
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anonymous users
CREATE POLICY "Allow anonymous inserts" ON waitlist
  FOR INSERT WITH CHECK (true);
```

3. Add Supabase credentials to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Enable waitlist form in `src/components/CTA.tsx`:

```tsx
const showWaitlist = true;  // Change to true
```

## Customization

### Brand Colors

Edit `src/app/globals.css`:

```css
:root {
  --primary: #10b981;      /* Your primary brand color */
  --primary-dark: #059669;
  --secondary: #8b5cf6;    /* Accent/gradient color */
}
```

### Content

1. **Hero Section** - `src/components/Hero.tsx`
   - Update headline and description
   - Add phone screenshot to `public/` and update PhoneMockup

2. **Features** - `src/components/Features.tsx`
   - Update the `features` array with your app's features
   - Change icons (using emoji or add SVG icons)

3. **How It Works** - `src/components/HowItWorks.tsx`
   - Update the `steps` array

4. **Footer** - `src/components/Footer.tsx`
   - Update social media links
   - Add/remove footer sections

### Legal Pages

Update these pages with your actual policies:
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/delete-account/page.tsx`

### SEO & Meta Tags

Edit `src/app/layout.tsx`:
- Update metadata object with your app's info
- Add your own `og-image.png` to `public/` (1200x630px)
- Add `favicon.ico` and `apple-touch-icon.png` to `public/`

## Pages Included

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/delete-account` | Account deletion instructions (required for App Store) |
| `/invite/[code]` | Handle invite deep links |
| `/join/[code]` | Handle group join deep links |
| `/android` | Redirect to Play Store |

## Deep Linking

The `/invite/[code]` and `/join/[code]` pages handle universal links:

1. User clicks a link like `https://yourapp.com/invite/ABC123`
2. Page attempts to open `yourapp://invite/ABC123` (your app's deep link)
3. If app isn't installed, shows download buttons

Make sure:
- Your mobile app handles these URL schemes
- Apple App Site Association file is set up for iOS
- Android App Links are configured for Android

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Static Export (Netlify, GitHub Pages, etc.)

1. Uncomment `output: 'export'` in `next.config.ts`
2. Build: `npm run build`
3. Deploy the `out` folder

### Environment Variables in Production

Set these in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables

## File Structure

```
website-template/
├── public/
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── og-image.png
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout with SEO
│   │   ├── page.tsx          # Home page
│   │   ├── globals.css       # Global styles & CSS vars
│   │   ├── privacy/          # Privacy policy
│   │   ├── terms/            # Terms of service
│   │   ├── delete-account/   # Account deletion
│   │   ├── invite/[code]/    # Invite deep link handler
│   │   ├── join/[code]/      # Join deep link handler
│   │   └── android/          # Play Store redirect
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── CTA.tsx
│   │   ├── Footer.tsx
│   │   ├── DownloadButtons.tsx
│   │   ├── PhoneMockup.tsx
│   │   └── WaitlistForm.tsx
│   └── lib/
│       └── supabase.ts       # Supabase client & helpers
├── .env.example
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## Checklist

- [ ] Copy template and rename folder
- [ ] Run `npm install`
- [ ] Create `.env.local` from `.env.example`
- [ ] Update app name and URLs
- [ ] Customize brand colors in `globals.css`
- [ ] Update hero headline and description
- [ ] Update features list
- [ ] Update legal pages with real policies
- [ ] Add app screenshots/mockup images
- [ ] Add favicon and OG image
- [ ] Test deep links work with your mobile app
- [ ] Deploy to hosting platform
- [ ] Configure custom domain
