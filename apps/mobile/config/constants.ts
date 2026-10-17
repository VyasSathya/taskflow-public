// ===========================================
// Environment Variables (from .env)
// ===========================================

// Required env vars - app won't work without these
const REQUIRED_ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
} as const;

// Optional env vars - app works without these (with reduced features)
const OPTIONAL_ENV = {
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY || '',
  POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
  REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
  REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
  // Add more optional env vars as needed
} as const;

// Validate required env vars at startup
const validateEnv = () => {
  const missing: string[] = [];

  if (!REQUIRED_ENV.SUPABASE_URL) {
    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!REQUIRED_ENV.SUPABASE_ANON_KEY) {
    missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (missing.length > 0) {
    console.warn(
      `⚠️ Missing required environment variables:\n` +
      `   ${missing.join('\n   ')}\n\n` +
      `   Copy .env.example to .env and fill in the values.\n` +
      `   App will run with limited functionality.`
    );
  }

  return missing.length === 0;
};

// Run validation on import
export const isEnvValid = validateEnv();

// Combined ENV object for backwards compatibility
export const ENV = {
  // Required (may be empty string if not configured)
  SUPABASE_URL: REQUIRED_ENV.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: REQUIRED_ENV.SUPABASE_ANON_KEY || '',
  // Optional
  ...OPTIONAL_ENV,
} as const;

// ===========================================
// App Configuration (hardcoded, not secrets)
// ===========================================

export const APP_CONFIG = {
  name: 'MyApp',
  scheme: 'myapp',
  version: '1.0.0',
  bundleId: 'com.myapp.app',
  // URLs (update when you have real URLs)
  termsUrl: 'https://myapp.com/terms',
  privacyUrl: 'https://myapp.com/privacy',
  supportEmail: 'support@myapp.com',
} as const;

// ===========================================
// API & Query Configuration
// ===========================================

export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  retry: 2,
} as const;

export const SESSION_CONFIG = {
  refreshThreshold: 5 * 60, // 5 minutes in seconds
} as const;

// ===========================================
// Feature Flags (based on env var presence)
// ===========================================

export const FEATURES = {
  errorTracking: Boolean(OPTIONAL_ENV.SENTRY_DSN),
  analytics: Boolean(OPTIONAL_ENV.POSTHOG_KEY),
  inAppPurchases: Boolean(OPTIONAL_ENV.REVENUECAT_IOS_KEY || OPTIONAL_ENV.REVENUECAT_ANDROID_KEY),
} as const;
