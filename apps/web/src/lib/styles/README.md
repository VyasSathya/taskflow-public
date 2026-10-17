# VibeTasks UI Style System

This directory contains centralized styling constants for consistent UI across the VibeTasks web app.

## Files

### `constants.ts`

Exports style constants and helper functions for:

- **SPACING** - Page padding, container max-widths, card padding, gaps
- **PAGE_HEADER** - Consistent header styling across all pages
- **COLORS** - Semantic color mappings for status, priority, and UI states
- **CARD_STYLES** - Card base styles, hover states, and accent colors
- **EMPTY_STATE** - Consistent empty state styling
- **LOADING** - Loading spinner and skeleton styles
- **FILTER_BAR** - Filter UI component styling
- **STAT_CARD** - Stats card styling
- **ICON_SIZE** - Standard icon sizes

## Usage

```tsx
import { 
  PAGE_HEADER, 
  EMPTY_STATE, 
  LOADING, 
  COLORS, 
  SPACING 
} from '@/lib/styles/constants';

// Page header
<div className={PAGE_HEADER.container}>
  <h1 className={PAGE_HEADER.title}>Page Title</h1>
  <p className={PAGE_HEADER.subtitle}>Description</p>
</div>

// Empty state
<div className={EMPTY_STATE.container}>
  <Icon className={EMPTY_STATE.icon} />
  <p className={EMPTY_STATE.title}>No items</p>
  <p className={EMPTY_STATE.description}>Add some!</p>
</div>

// Loading
<div className={LOADING.fullPage}>
  <Loader2 className={LOADING.spinner} />
</div>

// Colors
<span className={COLORS.status.vibing.text}>Vibing</span>
<span className={COLORS.priority.high.text}>High Priority</span>
<span className={COLORS.semantic.error.text}>Error</span>
```

## Color Mapping

### Status Colors
- `todo` - Gray
- `vibing` - Purple
- `done` - Emerald/Green
- `archived` - Muted

### Priority Colors
- `high` - Red
- `medium` - Amber
- `low` - Blue
- `none` - Muted

### Semantic Colors
- `error` - Red
- `success` - Emerald/Green
- `warning` - Amber
- `info` - Blue
- `purple` - Purple (for vibing/AI related)

## Page Structure

All pages should follow this structure:

```tsx
<div className="flex flex-col h-full">
  {/* Header */}
  <div className={PAGE_HEADER.container}>
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={PAGE_HEADER.icon} />
        <h1 className={PAGE_HEADER.title}>Title</h1>
      </div>
      <p className={PAGE_HEADER.subtitle}>Subtitle</p>
    </div>
    {/* Actions */}
  </div>

  {/* Content */}
  <div className={`flex-1 overflow-auto ${SPACING.page.all} ${SPACING.container.md} mx-auto w-full`}>
    {/* Page content */}
  </div>
</div>
```

## Components

### `PageWrapper` (ui/page-wrapper.tsx)

A reusable component that provides consistent page structure:

```tsx
import { PageWrapper, EmptyState } from '@/components/ui/page-wrapper';

<PageWrapper
  header={{
    icon: <MyIcon />,
    title: "Page Title",
    subtitle: "Description",
    actions: <Button>Action</Button>
  }}
  isLoading={isLoading}
  error={error}
  maxWidth="md"
>
  {/* Content */}
</PageWrapper>
```
