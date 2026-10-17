# Setup Guides

Comprehensive step-by-step guides for setting up each service in your app.

## Guides

| # | Guide | What It Sets Up |
|---|-------|-----------------|
| 1 | [Supabase](./01-SUPABASE.md) | Auth, database, user profiles, social login |
| 2 | [EAS Build](./02-EAS-BUILD.md) | App store builds, deployment, OTA updates |
| 3 | [Sentry](./03-SENTRY.md) | Crash reporting, error tracking, source maps |
| 4 | [PostHog](./04-POSTHOG.md) | Analytics, feature flags, session replay |
| 5 | [Push Notifications](./05-PUSH-NOTIFICATIONS.md) | Push tokens, local notifications, server-side sending |
| 6 | [RevenueCat](./06-REVENUECAT.md) | In-app purchases, subscriptions, paywalls |

## Quick Reference

### Environment Variables

All services use these env vars (add to `.env`):

```env
# Required: Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Optional: Sentry
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Optional: PostHog
EXPO_PUBLIC_POSTHOG_KEY=phc_xxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://us.posthog.com
```

### EAS Secrets (Sensitive - Don't put in .env)

```bash
eas secret:create --name SENTRY_AUTH_TOKEN --value "your-token"
```

### Minimum Viable Setup

For a working app, you only need:
1. **Supabase** - For auth and data
2. **EAS Build** - When ready to deploy

Analytics, error tracking, and push are optional but recommended.

## Recommended Order

1. **Start here:** [Supabase](./01-SUPABASE.md) - Get auth working
2. **Before shipping:** [EAS Build](./02-EAS-BUILD.md) - Build for devices
3. **Before production:** [Sentry](./03-SENTRY.md) - Catch errors
4. **For growth:** [PostHog](./04-POSTHOG.md) - Understand users
5. **For engagement:** [Push Notifications](./05-PUSH-NOTIFICATIONS.md) - Re-engage users
6. **For revenue:** [RevenueCat](./06-REVENUECAT.md) - Monetize your app
