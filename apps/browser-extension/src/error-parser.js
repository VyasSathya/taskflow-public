/**
 * Error Parser - Browser Extension version of shared error-parser
 * 
 * Matches the format from @vibetasks/shared for consistency.
 * Extracts structured ErrorContext from raw error text.
 */

// =============================================================================
// ERROR PATTERNS - Same categories as shared/utils/error-parser.ts
// =============================================================================

const ERROR_PATTERNS = [
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
      /^Error:/m,
      /at\s+.+\s+\(.+:\d+:\d+\)/,
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

  // React / Browser console errors
  {
    category: 'nodejs', // Browser JS uses same category
    patterns: [
      /Uncaught Error:/,
      /Warning:/,
      /Minified React error/,
      /Failed to fetch/,
      /NetworkError/,
      /CORS.*policy/i,
      /\d{3}\s*\([^)]+\)/,
    ],
    extractType: (text) => {
      if (text.includes('Uncaught')) return 'Uncaught Error';
      if (text.includes('Warning:')) return 'React Warning';
      if (text.includes('Minified React')) return 'React Error';
      if (text.includes('Failed to fetch') || text.includes('NetworkError')) return 'Network Error';
      if (/CORS/i.test(text)) return 'CORS Error';
      const httpMatch = text.match(/(\d{3})\s*\(([^)]+)\)/);
      if (httpMatch) return `HTTP ${httpMatch[1]}`;
      return 'Browser Error';
    },
    extractMessage: (text) => {
      const match = text.match(/(?:Uncaught Error|Warning|Error):\s*(.+?)(?:\n|$)/);
      return match ? match[1].trim() : undefined;
    },
    extractFile: (text) => {
      // Chrome/Node format: at functionName (file:line:col)
      const match = text.match(/at\s+(?:.*?)\s*\(?(https?:\/\/[^\s:]+):(\d+):(\d+)\)?/);
      if (match) {
        return { path: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
      }
      // Direct file reference
      const fileMatch = text.match(/([^\s]+\.[jt]sx?):(\d+):(\d+)/);
      if (fileMatch) {
        return { path: fileMatch[1], line: parseInt(fileMatch[2]), column: parseInt(fileMatch[3]) };
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
 * Matches the shared package format for consistency across all VibeTasks clients.
 * 
 * @param {string} rawText - The raw error text
 * @returns {Object|null} ErrorContext object or null if not detected as error
 */
export function parseError(rawText) {
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
        capture_source: 'browser',
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
      capture_source: 'browser',
    };
  }

  return null;
}

/**
 * Check if text looks like an error (for fallback detection)
 */
function looksLikeError(text) {
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
function extractStackTrace(text) {
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
function generateSuggestion(category, errorType) {
  const suggestions = {
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
      'Network Error': 'Check network connectivity and API endpoint availability.',
      'CORS Error': 'Server needs to allow cross-origin requests from this domain.',
    },
    webpack: {
      default: 'Check that all imports exist and paths are correct.',
    },
    vite: {
      default: 'Check module imports and Vite configuration.',
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
 * @param {Object} error - Parsed error context
 * @returns {string} Task title (max 100 chars)
 */
export function generateErrorTaskTitle(error) {
  const prefix = {
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
  let title = `${prefix[category] || 'Fix'} ${error.error_type || 'error'}`;
  
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
export function detectProjectFromError(error) {
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

/**
 * Quick check if text contains an error
 */
export function containsError(text) {
  if (!text || text.length < 10) return false;
  
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.patterns.some(p => p.test(text))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Format error as markdown notes for task description
 */
export function formatErrorAsNotes(errorContext) {
  let notes = '';
  
  // Add metadata header
  if (errorContext.file_path || errorContext.error_type) {
    notes += '## Error Details\n\n';
    if (errorContext.category && errorContext.category !== 'general') {
      notes += `**Category:** ${errorContext.category}\n`;
    }
    if (errorContext.error_type) {
      notes += `**Type:** ${errorContext.error_type}\n`;
    }
    if (errorContext.file_path) {
      notes += `**File:** \`${errorContext.file_path}\``;
      if (errorContext.line_number) {
        notes += `:${errorContext.line_number}`;
        if (errorContext.column) {
          notes += `:${errorContext.column}`;
        }
      }
      notes += '\n';
    }
    notes += '\n';
  }
  
  // Add suggestion if available
  if (errorContext.suggestion) {
    notes += '## Suggestion\n\n';
    notes += `${errorContext.suggestion}\n\n`;
  }
  
  // Add raw error in code block
  notes += '## Stack Trace\n\n';
  notes += '```\n';
  notes += errorContext.raw_text;
  notes += '\n```\n';
  
  // Add capture metadata
  notes += '\n---\n';
  notes += `*Captured via VibeTasks Browser Extension on ${new Date().toLocaleString()}*\n`;
  
  return notes;
}
