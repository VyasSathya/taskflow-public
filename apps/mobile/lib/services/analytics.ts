// Analytics service
// For production, integrate with PostHog:
// import PostHog from 'posthog-react-native';

import { ENV } from '@/config/constants';

interface EventProperties {
  [key: string]: unknown;
}

interface UserTraits {
  [key: string]: unknown;
}

class AnalyticsService {
  private initialized: boolean = false;
  private userId: string | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (!ENV.POSTHOG_KEY) {
      console.log('PostHog key not configured, analytics disabled');
      return;
    }

    // Uncomment when adding PostHog:
    // await PostHog.initAsync(ENV.POSTHOG_KEY, {
    //   host: 'https://app.posthog.com',
    // });

    this.initialized = true;
  }

  identify(userId: string, traits?: UserTraits): void {
    this.userId = userId;

    // Uncomment when adding PostHog:
    // PostHog.identify(userId, traits);
  }

  track(event: string, properties?: EventProperties): void {
    if (!this.initialized) return;

    console.log('[Analytics]', event, properties);

    // Uncomment when adding PostHog:
    // PostHog.capture(event, properties);
  }

  screen(name: string, properties?: EventProperties): void {
    if (!this.initialized) return;

    console.log('[Analytics] Screen:', name, properties);

    // Uncomment when adding PostHog:
    // PostHog.screen(name, properties);
  }

  reset(): void {
    this.userId = null;

    // Uncomment when adding PostHog:
    // PostHog.reset();
  }

  // Common events
  trackSignUp(method: string): void {
    this.track('user_signed_up', { method });
  }

  trackSignIn(method: string): void {
    this.track('user_signed_in', { method });
  }

  trackSignOut(): void {
    this.track('user_signed_out');
  }

  trackOnboardingStep(step: number, stepName: string): void {
    this.track('onboarding_step', { step, step_name: stepName });
  }

  trackOnboardingComplete(): void {
    this.track('onboarding_completed');
  }

  trackFeatureUsed(feature: string, details?: EventProperties): void {
    this.track('feature_used', { feature, ...details });
  }

  trackError(error: string, context?: EventProperties): void {
    this.track('error_occurred', { error, ...context });
  }
}

export const analytics = new AnalyticsService();
