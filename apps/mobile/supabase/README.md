# Supabase Setup Scripts

SQL scripts to set up your Supabase database for a new project.

## Quick Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each script in order (00, 01, 02, etc.)
4. Or run `00-full-setup.sql` to run everything at once

## Scripts

| File | Description |
|------|-------------|
| `00-full-setup.sql` | **Run this one file to set up everything** |
| `01-profiles.sql` | User profiles extending Supabase auth |
| `02-config.sql` | App configuration key-value store |
| `03-waitlist.sql` | Pre-launch email waitlist |
| `04-invite-codes.sql` | Referral/invite code system |
| `05-push-tokens.sql` | Push notification device tokens |
| `06-user-content.sql` | User-generated content storage |
| `07-subscriptions.sql` | RevenueCat subscription tracking |

## What Gets Created

### Tables
- `profiles` - User profiles (auto-created on signup)
- `config` - App settings (feature flags, URLs, etc.)
- `waitlist` - Pre-launch email collection
- `invite_codes` - Referral codes with usage tracking
- `push_tokens` - Device tokens for push notifications
- `user_content` - Generic user content storage
- `subscriptions` - Subscription status from RevenueCat

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Public tables (config, waitlist) have appropriate restrictions

## After Running Scripts

1. Copy your Supabase URL and anon key
2. Add to your `.env` file:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
   ```
3. Add to `website/.env.local` (same values)

## Customization

Each script is independent - skip what you don't need:
- Don't need waitlist? Skip `03-waitlist.sql`
- Don't need invites? Skip `04-invite-codes.sql`
- Add your own tables following the same patterns
