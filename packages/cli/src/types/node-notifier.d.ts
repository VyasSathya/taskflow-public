declare module 'node-notifier' {
  interface NotificationCallback {
    (error: Error | null, response: string, metadata?: unknown): void;
  }

  interface Notification {
    title?: string;
    message?: string;
    subtitle?: string;
    sound?: boolean | string;
    icon?: string;
    contentImage?: string;
    open?: string;
    wait?: boolean;
    timeout?: number | false;
    closeLabel?: string;
    actions?: string | string[];
    dropdownLabel?: string;
    reply?: boolean;
  }

  interface Notifier {
    notify(notification: Notification, callback?: NotificationCallback): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
  }

  const notifier: Notifier;
  export = notifier;
}
