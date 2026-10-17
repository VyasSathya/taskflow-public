// Error reporting service
// For production, integrate with Sentry:
// import * as Sentry from '@sentry/react-native';

import { ENV } from '@/config/constants';

interface ErrorContext {
  [key: string]: unknown;
}

interface UserInfo {
  id: string;
  email?: string;
  username?: string;
}

class ErrorReportingService {
  private initialized: boolean = false;
  private user: UserInfo | null = null;

  init(): void {
    if (this.initialized) return;
    if (!ENV.SENTRY_DSN) {
      console.log('Sentry DSN not configured, error reporting disabled');
      return;
    }

    // Uncomment when adding Sentry:
    // Sentry.init({
    //   dsn: ENV.SENTRY_DSN,
    //   enableAutoSessionTracking: true,
    //   sessionTrackingIntervalMillis: 30000,
    // });

    this.initialized = true;
  }

  setUser(user: UserInfo | null): void {
    this.user = user;

    // Uncomment when adding Sentry:
    // if (user) {
    //   Sentry.setUser({
    //     id: user.id,
    //     email: user.email,
    //     username: user.username,
    //   });
    // } else {
    //   Sentry.setUser(null);
    // }
  }

  captureException(error: Error, context?: ErrorContext): void {
    console.error('Error:', error.message, context);

    // Uncomment when adding Sentry:
    // Sentry.captureException(error, {
    //   extra: context,
    // });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    console.log(`[${level.toUpperCase()}]`, message);

    // Uncomment when adding Sentry:
    // Sentry.captureMessage(message, level);
  }

  addBreadcrumb(
    message: string,
    category?: string,
    data?: Record<string, unknown>
  ): void {
    // Uncomment when adding Sentry:
    // Sentry.addBreadcrumb({
    //   message,
    //   category,
    //   data,
    //   level: 'info',
    // });
  }

  setTag(key: string, value: string): void {
    // Uncomment when adding Sentry:
    // Sentry.setTag(key, value);
  }

  setContext(name: string, context: Record<string, unknown>): void {
    // Uncomment when adding Sentry:
    // Sentry.setContext(name, context);
  }
}

export const errorReporting = new ErrorReportingService();
