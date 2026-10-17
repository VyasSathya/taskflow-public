/**
 * Shared Styles - Consistent UI patterns across all screens
 * 
 * This file defines reusable style patterns to ensure consistency:
 * - Screen headers (title + subtitle)
 * - Loading states (ActivityIndicator styling)
 * - Color constants for semantic meaning
 * - Common layout patterns
 */

import { StyleSheet, Platform } from 'react-native';
import { tokens } from './tokens';

// ============================================================================
// SEMANTIC COLORS - Match web app exactly
// ============================================================================

export const semanticColors = {
  // Status colors
  vibing: '#8B5CF6',        // Purple - "in progress" state
  vibingLight: 'rgba(139, 92, 246, 0.1)',
  vibingBorder: 'rgba(139, 92, 246, 0.3)',
  
  // Priority colors
  priorityHigh: '#EF4444',   // Red
  priorityMedium: '#F59E0B', // Amber
  priorityLow: '#3B82F6',    // Blue
  priorityNone: '#6B7280',   // Gray
  
  // Semantic colors
  error: '#EF4444',          // Red - errors, high priority
  errorLight: 'rgba(239, 68, 68, 0.1)',
  errorBorder: 'rgba(239, 68, 68, 0.3)',
  
  success: '#10B981',        // Green - completed, success
  successLight: 'rgba(16, 185, 129, 0.1)',
  successBorder: 'rgba(16, 185, 129, 0.3)',
  
  warning: '#F59E0B',        // Amber - warnings, due soon
  warningLight: 'rgba(245, 158, 11, 0.1)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  
  info: '#3B82F6',           // Blue - informational
  infoLight: 'rgba(59, 130, 246, 0.1)',
  infoBorder: 'rgba(59, 130, 246, 0.3)',
  
  // AI colors
  ai: '#8B5CF6',             // Purple - AI created/context
  aiLight: 'rgba(139, 92, 246, 0.1)',
  aiBorder: 'rgba(139, 92, 246, 0.3)',
  
  // Project colors
  project: '#A78BFA',        // Light purple - project tags
  projectLight: 'rgba(167, 139, 250, 0.1)',
  projectBorder: 'rgba(167, 139, 250, 0.3)',
} as const;

// ============================================================================
// TYPOGRAPHY - Consistent text styles
// ============================================================================

export const typography = {
  // Screen titles (H1)
  screenTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  
  // Screen subtitles
  screenSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  
  // Section headers (H2)
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  
  // Section labels (uppercase)
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  
  // Card titles
  cardTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  
  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  
  // Caption text
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  
  // Small text
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  
  // Badge text
  badge: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
} as const;

// ============================================================================
// SHARED STYLES - Reusable StyleSheet patterns
// ============================================================================

export const sharedStyles = StyleSheet.create({
  // Screen container
  screenContainer: {
    flex: 1,
  },
  
  // Screen header container
  screenHeader: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
  
  // Screen header with more padding (for settings-like screens)
  screenHeaderLarge: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.sm,
  },
  
  // Title row with optional right content
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.sm,
  },
  
  // Title container
  titleContainer: {
    flex: 1,
  },
  
  // Title with icon
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: 2,
  },
  
  // Screen title text
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  
  // Screen subtitle text
  screenSubtitle: {
    fontSize: 14,
  },
  
  // List content container
  listContent: {
    flexGrow: 1,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxl,
  },
  
  // Error container (centered)
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.lg,
  },
  
  // Empty container
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  
  // Loading container
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Section header
  sectionHeader: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
  
  // Section title row
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  
  // Card base style
  card: {
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
  },
  
  // Settings row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.xl,
    marginBottom: tokens.spacing.xs,
  },
  
  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  
  // Chip/badge base
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
  },
  
  // Icon container (for settings rows)
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Bottom sheet content
  sheetContent: {
    flex: 1,
    padding: tokens.spacing.md,
  },
  
  // Bottom sheet title
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: tokens.spacing.lg,
  },
});

// ============================================================================
// LOADING INDICATOR CONFIG - Consistent ActivityIndicator styling
// ============================================================================

export const loadingIndicatorConfig = {
  // Default loading indicator size
  defaultSize: 'large' as const,
  
  // Small loading indicator (for buttons, inline)
  smallSize: 'small' as const,
  
  // Get tint color from theme
  getTintColor: (colors: { primary: string }) => colors.primary,
} as const;

// ============================================================================
// PULL TO REFRESH CONFIG - Consistent RefreshControl styling
// ============================================================================

export const refreshControlConfig = {
  // Get tint color from theme
  getTintColor: (colors: { primary: string }) => colors.primary,
  
  // Default refresh control props
  getProps: (colors: { primary: string }) => ({
    tintColor: colors.primary,
    colors: [colors.primary], // Android
  }),
} as const;

// ============================================================================
// ICON SIZES - Consistent icon sizing
// ============================================================================

export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  header: 24,     // For header icons
  tab: 24,        // For tab bar icons
  button: 20,     // For button icons
  badge: 12,      // For badge icons
  listItem: 22,   // For list item icons
} as const;

// ============================================================================
// SAFE AREA DEFAULTS
// ============================================================================

export const safeAreaDefaults = {
  // Default edges for screens with tab bar
  screenWithTabBar: ['top'] as const,
  
  // Default edges for modal screens
  modal: ['top', 'bottom'] as const,
  
  // Default edges for full screen
  fullScreen: ['top', 'bottom', 'left', 'right'] as const,
} as const;
