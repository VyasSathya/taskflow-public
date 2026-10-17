import { addDays, addWeeks, addMonths, format, parse, isValid } from 'date-fns';

/**
 * Parse flexible date strings into ISO format
 * Supports: "today", "tomorrow", "+3d", "+2w", "+1m", "YYYY-MM-DD"
 */
export function parseDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lowerStr = dateStr.toLowerCase().trim();

  // Handle "today"
  if (lowerStr === 'today') {
    return today.toISOString();
  }

  // Handle "tomorrow"
  if (lowerStr === 'tomorrow') {
    return addDays(today, 1).toISOString();
  }

  // Handle relative dates: +3d, +2w, +1m
  const relativeMatch = lowerStr.match(/^\+(\d+)([dwm])$/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];

    if (unit === 'd') {
      return addDays(today, amount).toISOString();
    } else if (unit === 'w') {
      return addWeeks(today, amount).toISOString();
    } else if (unit === 'm') {
      return addMonths(today, amount).toISOString();
    }
  }

  // Try parsing as YYYY-MM-DD
  const parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
  if (isValid(parsedDate)) {
    return parsedDate.toISOString();
  }

  // Try parsing as MM/DD/YYYY
  const usDate = parse(dateStr, 'MM/dd/yyyy', new Date());
  if (isValid(usDate)) {
    return usDate.toISOString();
  }

  // Invalid format
  throw new Error(
    `Invalid date format: "${dateStr}". ` +
    'Use: "today", "tomorrow", "+3d", "+2w", "+1m", or "YYYY-MM-DD"'
  );
}

/**
 * Format ISO date string for display
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  if (diffDays > 0 && diffDays < 7) return `in ${diffDays} days`;
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;

  return format(date, 'MMM d, yyyy');
}
