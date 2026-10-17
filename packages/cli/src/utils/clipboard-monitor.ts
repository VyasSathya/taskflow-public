/**
 * Clipboard Monitor Utility
 * Monitors clipboard for error patterns and provides callbacks when detected.
 * Uses the shared error parser from @vibetasks/shared.
 */

import {
  parseError,
  containsError,
  generateErrorTaskTitle,
  type ErrorContext,
  type ErrorCategory,
} from '@vibetasks/shared';

// Re-export types for backwards compatibility
export type { ErrorContext, ErrorCategory };

// Legacy alias for backwards compatibility
export type ErrorInfo = ErrorContext;

// Dynamic import for clipboardy (ESM module)
let clipboardy: typeof import('clipboardy') | null = null;

async function getClipboardy() {
  if (!clipboardy) {
    clipboardy = await import('clipboardy');
  }
  return clipboardy;
}

// ============================================
// ERROR DETECTION (using shared parser)
// ============================================

/**
 * Detect if text contains an error pattern
 * Uses the shared error parser from @vibetasks/shared
 */
export function detectError(text: string): ErrorInfo | null {
  return parseError(text, 'clipboard');
}

/**
 * Get a short summary of the error for display
 * Uses generateErrorTaskTitle from shared package
 */
export function getErrorSummary(error: ErrorInfo): string {
  if (!error) return 'Unknown error';
  return generateErrorTaskTitle(error);
}

/**
 * Format error for task notes (markdown)
 */
export function formatErrorForNotes(error: ErrorInfo): string {
  if (!error) return '';
  
  const lines: string[] = [];

  lines.push(`## Error Details`);
  lines.push('');
  
  if (error.error_type) {
    lines.push(`**Type:** ${error.error_type}`);
  }
  if (error.category) {
    lines.push(`**Category:** ${error.category}`);
  }
  if (error.message) {
    lines.push(`**Message:** ${error.message}`);
  }
  if (error.code) {
    lines.push(`**Code:** ${error.code}`);
  }
  if (error.file_path) {
    lines.push(`**File:** \`${error.file_path}\``);
    if (error.line_number) {
      lines.push(`**Line:** ${error.line_number}${error.column ? `:${error.column}` : ''}`);
    }
  }

  if (error.suggestion) {
    lines.push('');
    lines.push(`### Suggestion`);
    lines.push(error.suggestion);
  }

  if (error.stack_trace) {
    lines.push('');
    lines.push(`### Stack Trace`);
    lines.push('```');
    lines.push(error.stack_trace);
    lines.push('```');
  }

  lines.push('');
  lines.push(`### Raw Error`);
  lines.push('```');
  // Limit raw text to avoid massive notes
  const rawLines = error.raw_text.split('\n');
  if (rawLines.length > 30) {
    lines.push(rawLines.slice(0, 30).join('\n'));
    lines.push(`... (${rawLines.length - 30} more lines)`);
  } else {
    lines.push(error.raw_text);
  }
  lines.push('```');

  return lines.join('\n');
}

// ============================================
// CLIPBOARD MONITOR
// ============================================

export interface ClipboardMonitorOptions {
  /** Polling interval in milliseconds (default: 1000) */
  interval?: number;
  /** Callback when error detected */
  onError: (error: ErrorInfo) => void;
  /** Callback on monitor start */
  onStart?: () => void;
  /** Callback on monitor stop */
  onStop?: () => void;
  /** Minimum text length to consider (default: 20) */
  minLength?: number;
}

export interface ClipboardMonitor {
  start: () => Promise<void>;
  stop: () => void;
  isRunning: () => boolean;
}

/**
 * Create a clipboard monitor that watches for error patterns
 */
export function createClipboardMonitor(options: ClipboardMonitorOptions): ClipboardMonitor {
  const interval = options.interval || 1000;
  const minLength = options.minLength || 20;

  let running = false;
  let lastClipboardContent = '';
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const checkClipboard = async () => {
    try {
      const clipboard = await getClipboardy();
      const content = await clipboard.default.read();

      // Skip if content hasn't changed or is too short
      if (content === lastClipboardContent || content.length < minLength) {
        return;
      }

      lastClipboardContent = content;

      // Check for error patterns
      const error = detectError(content);
      if (error) {
        options.onError(error);
      }
    } catch {
      // Clipboard access may fail, ignore silently
    }
  };

  return {
    start: async () => {
      if (running) return;

      // Initialize clipboardy
      await getClipboardy();

      // Get initial clipboard state
      try {
        const clipboard = await getClipboardy();
        lastClipboardContent = await clipboard.default.read();
      } catch {
        lastClipboardContent = '';
      }

      running = true;
      options.onStart?.();

      intervalId = setInterval(checkClipboard, interval);
    },

    stop: () => {
      if (!running) return;

      running = false;

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      options.onStop?.();
    },

    isRunning: () => running,
  };
}

/**
 * Read current clipboard content
 */
export async function readClipboard(): Promise<string> {
  const clipboard = await getClipboardy();
  return clipboard.default.read();
}

/**
 * Check clipboard once for errors (non-monitoring)
 */
export async function checkClipboardForError(): Promise<ErrorInfo | null> {
  try {
    const content = await readClipboard();
    return detectError(content);
  } catch {
    return null;
  }
}
