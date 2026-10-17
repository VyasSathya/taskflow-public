/**
 * UI Style Constants
 * Centralized styling tokens for consistent UI across the app
 */

// =============================================================================
// SPACING
// =============================================================================

export const SPACING = {
  /** Page-level padding */
  page: {
    x: 'px-6',
    y: 'py-6',
    all: 'p-6',
  },
  /** Content container max-widths */
  container: {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    full: 'max-w-full',
  },
  /** Card internal spacing */
  card: {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  },
  /** Gap between items */
  gap: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6',
  },
  /** Vertical section spacing */
  section: 'space-y-6',
} as const;

// =============================================================================
// PAGE HEADER
// =============================================================================

export const PAGE_HEADER = {
  /** Container styles */
  container: 'px-6 py-4 border-b border-border flex items-center justify-between',
  /** Title styling */
  title: 'text-2xl font-bold',
  /** Subtitle/description styling */
  subtitle: 'text-sm text-muted-foreground',
  /** Icon next to title */
  icon: 'h-5 w-5 text-muted-foreground',
} as const;

// =============================================================================
// COLORS - Semantic Color Mapping
// =============================================================================

export const COLORS = {
  /** Status colors */
  status: {
    todo: {
      bg: 'bg-gray-500/20',
      text: 'text-gray-500',
      border: 'border-gray-500/30',
    },
    vibing: {
      bg: 'bg-purple-500/20',
      text: 'text-purple-500',
      border: 'border-purple-500/30',
    },
    done: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-500',
      border: 'border-emerald-500/30',
    },
    archived: {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      border: 'border-border',
    },
  },
  /** Priority colors */
  priority: {
    high: {
      bg: 'bg-red-500/20',
      text: 'text-red-500',
      border: 'border-red-500/30',
      dot: 'bg-red-500',
    },
    medium: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-500',
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
    },
    low: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-500',
      border: 'border-blue-500/30',
      dot: 'bg-blue-500',
    },
    none: {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      border: 'border-border',
      dot: 'bg-muted-foreground',
    },
  },
  /** Semantic colors */
  semantic: {
    error: {
      bg: 'bg-red-500/10',
      text: 'text-red-500',
      border: 'border-red-500/30',
    },
    success: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      border: 'border-emerald-500/30',
    },
    warning: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      border: 'border-amber-500/30',
    },
    info: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      border: 'border-blue-500/30',
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-500',
      border: 'border-purple-500/30',
    },
  },
} as const;

// =============================================================================
// CARDS
// =============================================================================

export const CARD_STYLES = {
  /** Base card (uses Card component) */
  base: 'bg-card text-card-foreground rounded-xl border shadow-sm',
  /** Interactive card hover state */
  interactive: 'transition-shadow hover:shadow-md',
  /** Card with colored accent */
  accent: {
    purple: 'border-purple-500/50 bg-purple-500/5',
    red: 'border-red-500/50 bg-red-500/5',
    emerald: 'border-emerald-500/50 bg-emerald-500/5',
    blue: 'border-blue-500/50 bg-blue-500/5',
  },
  /** Muted/disabled card */
  muted: 'opacity-60 bg-muted/30',
} as const;

// =============================================================================
// EMPTY STATES
// =============================================================================

export const EMPTY_STATE = {
  /** Container */
  container: 'text-center py-12',
  /** Icon */
  icon: 'h-12 w-12 mx-auto text-muted-foreground/50 mb-4',
  /** Title */
  title: 'text-lg font-medium text-muted-foreground',
  /** Description */
  description: 'text-sm text-muted-foreground/70 mt-1',
} as const;

// =============================================================================
// LOADING STATES
// =============================================================================

export const LOADING = {
  /** Spinner container */
  container: 'flex items-center justify-center',
  /** Spinner using Loader2 icon */
  spinner: 'h-6 w-6 animate-spin text-muted-foreground',
  /** Full page loading */
  fullPage: 'flex-1 flex items-center justify-center',
  /** Skeleton shimmer */
  skeleton: 'animate-pulse bg-muted rounded',
} as const;

// =============================================================================
// FILTER BAR
// =============================================================================

export const FILTER_BAR = {
  /** Container */
  container: 'border-b border-border',
  /** Toggle button */
  toggle: 'w-full px-6 py-2 flex items-center justify-between text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors',
  /** Active filter count badge */
  badge: 'px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-500 rounded-full',
  /** Filter content area */
  content: 'px-6 pb-4 space-y-4',
  /** Filter section label */
  label: 'text-xs font-medium text-muted-foreground',
  /** Active filters summary bar */
  summary: 'px-6 py-2 bg-purple-500/5 border-b border-purple-500/20 flex items-center gap-2 flex-wrap',
} as const;

// =============================================================================
// BUTTONS - Common button pattern classes
// =============================================================================

export const BUTTON_PATTERNS = {
  /** Filter pill button - unselected */
  filterPill: 'px-3 py-1.5 rounded-full text-sm border transition-colors',
  /** Filter pill button - selected */
  filterPillActive: 'text-white',
} as const;

// =============================================================================
// ICONS - Standard icon sizes
// =============================================================================

export const ICON_SIZE = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
  '2xl': 'h-8 w-8',
  '3xl': 'h-12 w-12',
} as const;

// =============================================================================
// STAT CARDS
// =============================================================================

export const STAT_CARD = {
  /** Container */
  container: 'p-3 rounded-lg border bg-card',
  /** Label with icon */
  label: 'flex items-center gap-2 text-sm font-medium mb-1',
  /** Value */
  value: 'text-2xl font-bold',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get priority color classes
 */
export function getPriorityColors(priority: 'high' | 'medium' | 'low' | 'none') {
  return COLORS.priority[priority];
}

/**
 * Get status color classes
 */
export function getStatusColors(status: 'todo' | 'vibing' | 'done' | 'archived') {
  return COLORS.status[status];
}

/**
 * Combine classes for a filter pill button
 */
export function getFilterPillClasses(isActive: boolean, colorClass: string) {
  return `${BUTTON_PATTERNS.filterPill} ${
    isActive 
      ? `${colorClass} ${BUTTON_PATTERNS.filterPillActive}` 
      : `border-${colorClass.replace('bg-', '')}/30 ${colorClass.replace('bg-', 'text-').replace('/20', '')} hover:${colorClass}/10`
  }`;
}
