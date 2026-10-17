/**
 * Error Capture Screen
 * Ultra low-friction: Paste error -> Create task
 * 
 * Uses shared error parsing logic (inlined for React Native compatibility)
 * Creates tasks with error_context for full context preservation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { useTaskMutations } from '@/lib/hooks/useTasks';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '@/components/common';
import { tokens, semanticColors, iconSizes } from '@/lib/theme';
import type { ErrorContext, ErrorCategory } from '@vibetasks/shared';

// =============================================================================
// ERROR PARSER (Inlined from @vibetasks/shared for React Native compatibility)
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
];

/**
 * Parse raw error text into structured ErrorContext
 */
function parseError(rawText: string): ErrorContext | null {
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
        capture_source: 'paste',
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
      capture_source: 'paste',
    };
  }

  return null;
}

function looksLikeError(text: string): boolean {
  const errorIndicators = [
    /error/i, /fail/i, /exception/i, /crash/i, /fatal/i,
    /undefined/i, /null/i, /cannot/i, /unable/i, /invalid/i,
  ];
  return errorIndicators.some(p => p.test(text));
}

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

function generateSuggestion(category: ErrorCategory, errorType?: string): string | undefined {
  const suggestions: Record<string, Record<string, string>> = {
    npm: {
      'ERESOLVE': 'Try: npm install --legacy-peer-deps',
      'E404': 'Package not found. Check the package name.',
      'ENOENT': 'File not found. Check if node_modules exists.',
    },
    typescript: {
      default: 'Check type definitions and imports.',
    },
    nodejs: {
      'TypeError': 'Check for undefined/null values.',
      'ReferenceError': 'Variable not defined. Check spelling.',
      'SyntaxError': 'Check for missing brackets or typos.',
    },
  };

  const categorySuggestions = suggestions[category];
  if (!categorySuggestions) return undefined;
  
  return categorySuggestions[errorType || ''] || categorySuggestions['default'];
}

/**
 * Generate a task title from parsed error context
 */
function generateErrorTaskTitle(error: ErrorContext): string {
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
    const snippet = error.message.substring(0, 50);
    title += `: ${snippet}`;
    if (error.message.length > 50) title += '...';
  }
  
  // Add file reference if available
  if (error.file_path && error.line_number) {
    const fileName = error.file_path.split(/[/\\]/).pop();
    title += ` in ${fileName}:${error.line_number}`;
  }
  
  return title.substring(0, 100);
}

/**
 * Detect project from error file path
 */
function detectProjectFromError(error: ErrorContext): string | undefined {
  if (!error.file_path) return undefined;
  
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
// COMPONENT
// =============================================================================

export default function ErrorsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const haptics = useHaptics();
  const { createTask } = useTaskMutations();
  const [errorText, setErrorText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedError, setParsedError] = useState<ErrorContext | null>(null);

  // Parse error as user types/pastes
  const handleTextChange = (text: string) => {
    setErrorText(text);
    if (text.trim().length > 10) {
      const parsed = parseError(text);
      setParsedError(parsed);
    } else {
      setParsedError(null);
    }
  };

  const handlePaste = async () => {
    haptics.selection();
    try {
      const text = await Clipboard.getString();
      if (text) {
        handleTextChange(text);
        haptics.success();
      }
    } catch (err) {
      console.error('Failed to paste:', err);
      haptics.error();
    }
  };

  const handleClear = () => {
    haptics.selection();
    setErrorText('');
    setParsedError(null);
  };

  const handleSubmit = async () => {
    if (!errorText.trim()) return;

    haptics.medium();
    setIsLoading(true);
    try {
      // Parse the error to get structured context
      const errorContext = parseError(errorText);
      
      // Generate title and detect project
      const title = errorContext 
        ? generateErrorTaskTitle(errorContext)
        : `Fix: ${errorText.split('\n')[0].slice(0, 60)}`;
      
      const project = errorContext 
        ? detectProjectFromError(errorContext)
        : undefined;

      // Create task with error_context field
      await createTask.mutateAsync({
        title,
        priority: 'high',
        status: 'todo',
        project_tag: project,
        created_by: 'human',
        // Store full error context for later reference
        error_context: errorContext || {
          raw_text: errorText,
          category: 'general',
          captured_at: new Date().toISOString(),
          capture_source: 'paste',
        },
      });

      haptics.success();
      Alert.alert('Task Created', 'Error captured with full context!', [
        { text: 'View Tasks', onPress: () => router.push('/') },
        { text: 'Capture Another', onPress: handleClear },
      ]);
    } catch (err) {
      console.error('Failed to create task:', err);
      haptics.error();
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    title: { color: colors.text },
    subtitle: { color: colors.textSecondary },
    actionButton: { 
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    actionButtonText: { color: colors.text },
    textInput: {
      backgroundColor: colors.surface,
      color: colors.text,
      borderColor: parsedError ? semanticColors.success : colors.border,
    },
    preview: { 
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    previewLabel: { color: colors.textSecondary },
    previewValue: { color: colors.text },
    tips: { backgroundColor: colors.surface },
    tipsTitle: { color: colors.text },
    tipText: { color: colors.textSecondary },
  };

  return (
    <SafeAreaWrapper edges={['top']}>
      <ScrollView 
        style={[styles.container, dynamicStyles.container]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.titleWithIcon}>
              <Ionicons 
                name="alert-circle" 
                size={iconSizes.header} 
                color={semanticColors.error}
              />
              <Text style={[styles.title, dynamicStyles.title]}>Capture Error</Text>
            </View>
            <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
              Paste any error to create a task
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.pasteButton, dynamicStyles.actionButton]} 
            onPress={handlePaste}
            activeOpacity={0.7}
          >
            <Ionicons name="clipboard-outline" size={iconSizes.button} color={semanticColors.vibing} />
            <Text style={[styles.actionButtonText, { color: semanticColors.vibing }]}>Paste Error</Text>
          </TouchableOpacity>
          {errorText.length > 0 && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.clearButton, dynamicStyles.actionButton]} 
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <Ionicons name="close-outline" size={iconSizes.button} color={colors.textSecondary} />
              <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Error text input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, dynamicStyles.textInput]}
            value={errorText}
            onChangeText={handleTextChange}
            placeholder="Paste your error here..."
            placeholderTextColor={colors.textSecondary}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {/* Parsed Error Preview */}
        {parsedError && (
          <View style={[styles.preview, dynamicStyles.preview]}>
            <View style={styles.previewHeader}>
              <Ionicons name="checkmark-circle" size={16} color={semanticColors.success} />
              <Text style={[styles.previewTitle, { color: semanticColors.success }]}>
                Error Detected
              </Text>
            </View>
            
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, dynamicStyles.previewLabel]}>Category</Text>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(parsedError.category) + '20' }]}>
                <Text style={[styles.categoryBadgeText, { color: getCategoryColor(parsedError.category) }]}>
                  {parsedError.category || 'general'}
                </Text>
              </View>
            </View>

            {parsedError.error_type && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, dynamicStyles.previewLabel]}>Type</Text>
                <Text style={[styles.previewValue, dynamicStyles.previewValue]}>{parsedError.error_type}</Text>
              </View>
            )}

            {parsedError.message && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, dynamicStyles.previewLabel]}>Message</Text>
                <Text style={[styles.previewValue, dynamicStyles.previewValue]} numberOfLines={2}>
                  {parsedError.message}
                </Text>
              </View>
            )}

            {parsedError.file_path && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, dynamicStyles.previewLabel]}>Location</Text>
                <Text style={[styles.previewValue, styles.filePathText, dynamicStyles.previewValue]} numberOfLines={1}>
                  {parsedError.file_path}
                  {parsedError.line_number && `:${parsedError.line_number}`}
                </Text>
              </View>
            )}

            {parsedError.suggestion && (
              <View style={styles.suggestionBox}>
                <Ionicons name="bulb-outline" size={14} color={semanticColors.warning} />
                <Text style={styles.suggestionText}>{parsedError.suggestion}</Text>
              </View>
            )}
          </View>
        )}

        {/* Submit button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!errorText.trim() || isLoading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!errorText.trim() || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={iconSizes.button} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Create Task</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Tips section */}
        <View style={[styles.tips, dynamicStyles.tips]}>
          <Text style={[styles.tipsTitle, dynamicStyles.tipsTitle]}>Quick Capture Flow</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>1</Text>
            <Text style={[styles.tipText, dynamicStyles.tipText]}>Copy error from terminal/console</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>2</Text>
            <Text style={[styles.tipText, dynamicStyles.tipText]}>Tap "Paste Error" above</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>3</Text>
            <Text style={[styles.tipText, dynamicStyles.tipText]}>Tap "Create Task" - done!</Text>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

// Helper function for category colors
function getCategoryColor(category?: ErrorCategory): string {
  const colors: Record<ErrorCategory, string> = {
    typescript: '#3178C6',
    nodejs: '#68A063',
    npm: '#CB3837',
    webpack: '#8DD6F9',
    vite: '#646CFF',
    expo: '#000020',
    python: '#3776AB',
    rust: '#DEA584',
    go: '#00ADD8',
    general: '#6B7280',
  };
  return colors[category || 'general'];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: tokens.spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm,
  },
  pasteButton: {
    flex: 1,
  },
  clearButton: {
    minWidth: 100,
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  inputContainer: {
    minHeight: 150,
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  textInput: {
    flex: 1,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    textAlignVertical: 'top',
    borderWidth: 2,
    minHeight: 150,
  },
  preview: {
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '500',
    width: 70,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewValue: {
    flex: 1,
    fontSize: 13,
  },
  filePathText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  categoryBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: tokens.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: semanticColors.warning,
  },
  suggestionText: {
    flex: 1,
    fontSize: 12,
    color: semanticColors.warning,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.md,
    marginHorizontal: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    backgroundColor: semanticColors.vibing,
    gap: tokens.spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  tips: {
    marginTop: tokens.spacing.lg,
    marginHorizontal: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: tokens.spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  tipNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: semanticColors.vibing,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  tipText: {
    fontSize: 13,
    flex: 1,
  },
  bottomSpacer: {
    height: tokens.spacing.xxl,
  },
});
