/**
 * Shared Error Parser - Single source of truth for error detection and parsing
 * 
 * Used by: Web, Mobile, CLI, MCP Server, Browser Extension, VS Code Extension
 * 
 * Design Goals:
 * - Extract actionable info from raw error text
 * - Detect error category (nodejs, typescript, npm, etc.)
 * - Generate task title from error
 * - Keep it fast and simple
 */

import type { ErrorContext, ErrorCategory } from '../types';

// =============================================================================
// ERROR PATTERNS
// =============================================================================

interface ErrorPattern {
  category: ErrorCategory;
  patterns: RegExp[];
  extractType: (text: string) => string | undefined;
  extractMessage: (text: string) => string | undefined;
  extractFile: (text: string) => { path?: string; line?: number; column?: number } | undefined;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // TypeScript errors (TS2304, TS2339, etc.)
  {
    category: 'typescript',
    patterns: [
      /TS\d{4,5}:/,
      /error TS\d+/i,
      /Type '.+' is not assignable/,
      /Property '.+' does not exist/,
      /Cannot find name/,
      /Cannot find module/,
    ],
    extractType: (text) => {
      const match = text.match(/TS(\d{4,5})/);
      return match ? `TS${match[1]}` : 'TypeScript Error';
    },
    extractMessage: (text) => {
      const match = text.match(/TS\d+:\s*(.+?)(?:\n|$)/);
      return match ? match[1].trim() : undefined;
    },
    extractFile: (text) => {
      const match = text.match(/([^\s:(]+\.[tj]sx?):(\d+):(\d+)/);
      if (match) {
        return { path: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
      }
      return undefined;
    },
  },

  // Node.js runtime errors
  {
    category: 'nodejs',
    patterns: [
      /TypeError:/,
      /ReferenceError:/,
      /SyntaxError:/,
      /RangeError:/,
      /Error:/,
      /at\s+.+\s+\(.+:\d+:\d+\)/,  // Stack trace pattern
    ],
    extractType: (text) => {
      const match = text.match(/(TypeError|ReferenceError|SyntaxError|RangeError|Error):/);
      return match ? match[1] : undefined;
    },
    extractMessage: (text) => {
      const match = text.match(/(TypeError|ReferenceError|SyntaxError|RangeError|Error):\s*(.+?)(?:\n|$)/);
      return match ? match[2].trim() : undefined;
    },
    extractFile: (text) => {
      const match = text.match(/at\s+.+\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        return { path: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
      }
      return undefined;
    },
  },

  // npm errors
  {
    category: 'npm',
    patterns: [
      /npm ERR!/,
      /npm error/i,
      /ERESOLVE/,
      /E404/,
      /ENOENT/,
      /peer dep/i,
      /Could not resolve dependency/,
    ],
    extractType: (text) => {
      if (text.includes('ERESOLVE')) return 'ERESOLVE';
      if (text.includes('E404')) return 'E404';
      if (text.includes('ENOENT')) return 'ENOENT';
      return 'npm Error';
    },
    extractMessage: (text) => {
      const match = text.match(/npm ERR!\s*(.+?)(?:\n|$)/);
      return match ? match[1].trim() : undefined;
    },
    extractFile: () => undefined,
  },

  // Webpack errors
  {
    category: 'webpack',
    patterns: [
      /Module not found/,
      /Failed to compile/,
      /webpack/i,
      /Module build failed/,
      /Can't resolve/,
    ],
    extractType: (text) => {
      if (text.includes('Module not found')) return 'Module Not Found';
      if (text.includes('Failed to compile')) return 'Compile Error';
      return 'Webpack Error';
    },
    extractMessage: (text) => {
      const match = text.match(/(?:Module not found|Failed to compile|Can't resolve)[:\s]*(.+?)(?:\n|$)/i);
      return match ? match[1].trim() : undefined;
    },
    extractFile: (text) => {
      const match = text.match(/in\s+(.+):(\d+):(\d+)/);
      if (match) {
        return { path: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
      }
      return undefined;
    },
  },

  // Vite errors
  {
    category: 'vite',
    patterns: [
      /\[vite\]/i,
      /vite:/i,
      /Vite Error/i,
    ],
    extractType: () => 'Vite Error',
    extractMessage: (text) => {
      const match = text.match(/\[vite\][:\s]*(.+?)(?:\n|$)/i);
      return match ? match[1].trim() : undefined;
    },
    extractFile: (text) => {
      const match = text.match(/([^\s]+\.[tj]sx?):(\d+):(\d+)/);
      if (match) {
        return { path: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
      }
      return undefined;
    },
  },

  // Expo / React Native
  {
    category: 'expo',
    patterns: [
      /Metro/i,
      /Invariant Violation/,
      /React Native/i,
      /expo/i,
      /Unable to resolve/,
    ],
    extractType: (text) => {
      if (text.includes('Invariant Violation')) return 'Invariant Violation';
      if (text.includes('Unable to resolve')) return 'Module Resolution';
      return 'Expo Error';
    },
    extractMessage: (text) => {
      const match = text.match(/(?:Invariant Violation|Error):\s*(.+?)(?:\n|$)/);
      return match ? match[1].trim() : undefined;
    },
    extractFile: (text) => {
      const match = text.match(/\(([^)]+):(\d+):(\d+)\)/);
      if (match) {
        return { path: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
      }
      return undefined;
    },
  },

  // Python errors
  {
    category: 'python',
    patterns: [
      /Traceback \(most recent call last\)/,
      /NameError:/,
      /ValueError:/,
      /TypeError:/,
      /ImportError:/,
      /AttributeError:/,
      /KeyError:/,
      /IndexError:/,
    ],
    extractType: (text) => {
      const match = text.match(/(NameError|ValueError|TypeError|ImportError|AttributeError|KeyError|IndexError):/);
      return match ? match[1] : 'Python Error';
    },
    extractMessage: (text) => {
      const match = text.match(/(NameError|ValueError|TypeError|ImportError|AttributeError|KeyError|IndexError):\s*(.+?)(?:\n|$)/);
      return match ? match[2].trim() : undefined;
    },
    extractFile: (text) => {
      const match = text.match(/File "(.+)", line (\d+)/);
      if (match) {
        return { path: match[1], line: parseInt(match[2]) };
      }
      return undefined;
    },
  },

  // Rust errors
  {
    category: 'rust',
    patterns: [
      /error\[E\d+\]/,
      /cargo/i,
      /rustc/i,
    ],
    extractType: (text) => {
      const match = text.match(/error\[(E\d+)\]/);
      return match ? match[1] : 'Rust Error';
    },
    extractMessage: (text) => {
      const match = text.match(/error(?:\[E\d+\])?:\s*(.+?)(?:\n|$)/);
      return match ? match[1].trim() : undefined;
    },
    extractFile: (text) => {
      const match = text.match(/--> (.+):(\d+):(\d+)/);
      if (match) {
        return { path: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
      }
      return undefined;
    },
  },

  // Go errors
  {
    category: 'go',
    patterns: [
      /go build/i,
      /go run/i,
      /undefined:/,
      /cannot use/,
      /imported and not used/,
    ],
    extractType: () => 'Go Error',
    extractMessage: (text) => {
      const match = text.match(/:\d+:\d+:\s*(.+?)(?:\n|$)/);
      return match ? match[1].trim() : undefined;
    },
    extractFile: (text) => {
      const match = text.match(/([^\s]+\.go):(\d+):(\d+)/);
      if (match) {
        return { path: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
      }
      return undefined;
    },
  },
];

// =============================================================================
// MAIN PARSER FUNCTION
// =============================================================================

/**
 * Parse raw error text into structured ErrorContext
 * 
 * @param rawText - The raw error text (from terminal, console, etc.)
 * @param source - Where the error was captured from
 * @returns Parsed ErrorContext or null if not detected as an error
 */
export function parseError(
  rawText: string,
  source: ErrorContext['capture_source'] = 'paste'
): ErrorContext | null {
  if (!rawText || rawText.trim().length < 10) {
    return null;
  }

  const text = rawText.trim();
  
  // Try each pattern category
  for (const pattern of ERROR_PATTERNS) {
    const isMatch = pattern.patterns.some(p => p.test(text));
    if (isMatch) {
      const fileInfo = pattern.extractFile(text);
      const stackTrace = extractStackTrace(text);
      
      return {
        raw_text: text,
        error_type: pattern.extractType(text),
        message: pattern.extractMessage(text),
        category: pattern.category,
        file_path: fileInfo?.path,
        line_number: fileInfo?.line,
        column: fileInfo?.column,
        stack_trace: stackTrace,
        suggestion: generateSuggestion(pattern.category, pattern.extractType(text)),
        captured_at: new Date().toISOString(),
        capture_source: source,
      };
    }
  }

  // Fallback: treat as general error if it looks error-like
  if (looksLikeError(text)) {
    return {
      raw_text: text,
      category: 'general',
      message: text.split('\n')[0].substring(0, 200),
      captured_at: new Date().toISOString(),
      capture_source: source,
    };
  }

  return null;
}

/**
 * Check if text looks like an error (for fallback detection)
 */
function looksLikeError(text: string): boolean {
  const errorIndicators = [
    /error/i,
    /fail/i,
    /exception/i,
    /crash/i,
    /fatal/i,
    /undefined/i,
    /null/i,
    /cannot/i,
    /unable/i,
    /invalid/i,
  ];
  return errorIndicators.some(p => p.test(text));
}

/**
 * Extract stack trace (first 20 lines)
 */
function extractStackTrace(text: string): string | undefined {
  const lines = text.split('\n');
  const stackLines = lines.filter(line => 
    /^\s*at\s+/.test(line) || // JS stack
    /^\s*File "/.test(line) || // Python
    /^\s+-->/.test(line) // Rust
  );
  
  if (stackLines.length === 0) return undefined;
  return stackLines.slice(0, 20).join('\n');
}

/**
 * Generate a fix suggestion based on error category and type
 */
function generateSuggestion(category: ErrorCategory, errorType?: string): string | undefined {
  const suggestions: Record<string, Record<string, string>> = {
    npm: {
      'ERESOLVE': 'Try: npm install --legacy-peer-deps or check package version compatibility',
      'E404': 'Package not found. Check the package name spelling.',
      'ENOENT': 'File or directory not found. Check if node_modules exists.',
    },
    typescript: {
      default: 'Check type definitions and ensure all imports are correct.',
    },
    nodejs: {
      'TypeError': 'Check for undefined/null values or incorrect type usage.',
      'ReferenceError': 'Variable is not defined. Check spelling and scope.',
      'SyntaxError': 'Check for missing brackets, quotes, or typos.',
    },
  };

  const categorySuggestions = suggestions[category];
  if (!categorySuggestions) return undefined;
  
  return categorySuggestions[errorType || ''] || categorySuggestions['default'];
}

// =============================================================================
// TASK TITLE GENERATION
// =============================================================================

/**
 * Generate a task title from parsed error context
 * 
 * @param error - Parsed error context
 * @returns Task title (max 100 chars)
 */
export function generateErrorTaskTitle(error: ErrorContext): string {
  const prefix: Record<ErrorCategory, string> = {
    nodejs: 'Fix',
    typescript: 'Fix TS',
    npm: 'Resolve npm',
    webpack: 'Fix webpack',
    vite: 'Fix Vite',
    expo: 'Fix Expo',
    python: 'Fix Python',
    rust: 'Fix Rust',
    go: 'Fix Go',
    general: 'Fix',
  };

  const category = error.category || 'general';
  let title = `${prefix[category]} ${error.error_type || 'error'}`;
  
  // Add message snippet if available
  if (error.message) {
    const snippet = error.message.substring(0, 60);
    title += `: ${snippet}`;
    if (error.message.length > 60) title += '...';
  }
  
  // Add file reference if available
  if (error.file_path && error.line_number) {
    const fileName = error.file_path.split(/[/\\]/).pop();
    title += ` in ${fileName}:${error.line_number}`;
  }
  
  return title.substring(0, 100);
}

/**
 * Detect project from file path in error
 */
export function detectProjectFromError(error: ErrorContext): string | undefined {
  if (!error.file_path) return undefined;
  
  // Look for common project folder patterns
  const patterns = [
    /apps\/([^/]+)/,
    /packages\/([^/]+)/,
    /src\/([^/]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = error.file_path.match(pattern);
    if (match) return match[1];
  }
  
  return undefined;
}

// =============================================================================
// ERROR DETECTION (for clipboard monitoring)
// =============================================================================

/**
 * Quick check if text contains an error (for clipboard monitoring)
 * This is a fast check that doesn't do full parsing.
 */
export function containsError(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Quick check against all patterns
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.patterns.some(p => p.test(text))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get the error category without full parsing (for quick classification)
 */
export function detectErrorCategory(text: string): ErrorCategory | null {
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.patterns.some(p => p.test(text))) {
      return pattern.category;
    }
  }
  return null;
}
