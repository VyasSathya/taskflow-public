/**
 * NLP Service for parsing natural language task input
 *
 * Extracts:
 * - Tags (#work, #personal)
 * - Priority (@high, @medium, @low)
 * - Due dates (tomorrow, today, next week, Monday, etc.)
 * - Times (at 2pm, at 14:00)
 *
 * Example: "Review budget tomorrow at 2pm #work @high"
 * Result: {
 *   title: "Review budget",
 *   due_date: "2026-01-07T14:00:00.000Z",
 *   tags: ["work"],
 *   priority: "high"
 * }
 */

export interface ParsedTaskInput {
  title: string;
  due_date: string | null;
  tags: string[];
  priority: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Parse natural language task input
 */
export function parseTaskInput(input: string): ParsedTaskInput {
  const result: ParsedTaskInput = {
    title: input.trim(),
    due_date: null,
    tags: [],
    priority: 'none',
  };

  // ========================================
  // Extract Tags (#work, #personal)
  // ========================================
  const tagMatches = input.match(/#(\w+)/g);
  if (tagMatches) {
    result.tags = tagMatches.map((tag) => tag.slice(1).toLowerCase());
    result.title = result.title.replace(/#\w+/g, '').trim();
  }

  // ========================================
  // Extract Priority (@high, @medium, @low)
  // ========================================
  const priorityMatch = input.match(/@(high|medium|low)/i);
  if (priorityMatch) {
    result.priority = priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low';
    result.title = result.title.replace(/@(high|medium|low)/i, '').trim();
  }

  // ========================================
  // Extract Due Date
  // ========================================

  // Date patterns with their offset from today
  const datePatterns = [
    { pattern: /\btoday\b/i, offset: 0 },
    { pattern: /\btomorrow\b/i, offset: 1 },
    { pattern: /\bnext week\b/i, offset: 7 },
    { pattern: /\bmonday\b/i, getDayOffset: () => getNextWeekday(1) },
    { pattern: /\btuesday\b/i, getDayOffset: () => getNextWeekday(2) },
    { pattern: /\bwednesday\b/i, getDayOffset: () => getNextWeekday(3) },
    { pattern: /\bthursday\b/i, getDayOffset: () => getNextWeekday(4) },
    { pattern: /\bfriday\b/i, getDayOffset: () => getNextWeekday(5) },
    { pattern: /\bsaturday\b/i, getDayOffset: () => getNextWeekday(6) },
    { pattern: /\bsunday\b/i, getDayOffset: () => getNextWeekday(0) },
  ];

  for (const datePattern of datePatterns) {
    if (datePattern.pattern.test(result.title)) {
      const date = new Date();
      const offset = datePattern.getDayOffset
        ? datePattern.getDayOffset()
        : datePattern.offset!;
      date.setDate(date.getDate() + offset);
      date.setHours(9, 0, 0, 0); // Default to 9am
      result.due_date = date.toISOString();
      result.title = result.title.replace(datePattern.pattern, '').trim();
      break;
    }
  }

  // ========================================
  // Extract Time (at 2pm, at 14:00, at 2:30pm)
  // ========================================
  const timeMatch = result.title.match(/\bat (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch && result.due_date) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();

    // Convert to 24-hour format
    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    } else if (!meridiem && hours < 12) {
      // No meridiem specified - if hour is < 12, assume PM for common work hours
      hours += 12;
    }

    const date = new Date(result.due_date);
    date.setHours(hours, minutes, 0, 0);
    result.due_date = date.toISOString();
    result.title = result.title.replace(/\bat \d{1,2}(?::\d{2})?\s*(am|pm)?/i, '').trim();
  }

  // ========================================
  // Extract Specific Dates (12/25, Dec 25, December 25)
  // ========================================

  // Format: MM/DD or M/D
  const slashDateMatch = result.title.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (slashDateMatch && !result.due_date) {
    const month = parseInt(slashDateMatch[1]) - 1; // 0-indexed
    const day = parseInt(slashDateMatch[2]);
    const date = new Date();
    date.setMonth(month);
    date.setDate(day);

    // If the date is in the past, assume next year
    if (date < new Date()) {
      date.setFullYear(date.getFullYear() + 1);
    }

    date.setHours(9, 0, 0, 0);
    result.due_date = date.toISOString();
    result.title = result.title.replace(/\b\d{1,2}\/\d{1,2}\b/, '').trim();
  }

  // Month names
  const monthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];

  for (let i = 0; i < monthNames.length; i++) {
    const monthPattern = new RegExp(`\\b(${monthNames[i]}|${monthNames[i].slice(0, 3)})\\s+(\\d{1,2})\\b`, 'i');
    const monthMatch = result.title.match(monthPattern);

    if (monthMatch && !result.due_date) {
      const day = parseInt(monthMatch[2]);
      const date = new Date();
      date.setMonth(i);
      date.setDate(day);

      // If the date is in the past, assume next year
      if (date < new Date()) {
        date.setFullYear(date.getFullYear() + 1);
      }

      date.setHours(9, 0, 0, 0);
      result.due_date = date.toISOString();
      result.title = result.title.replace(monthPattern, '').trim();
      break;
    }
  }

  // ========================================
  // Clean up extra whitespace
  // ========================================
  result.title = result.title.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Get the number of days until the next occurrence of a weekday
 * @param targetDay 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
function getNextWeekday(targetDay: number): number {
  const today = new Date();
  const currentDay = today.getDay();

  let daysUntilTarget = targetDay - currentDay;

  // If the target day is today or in the past this week, go to next week
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }

  return daysUntilTarget;
}

/**
 * Format a date for display (e.g., "Today", "Tomorrow", "Mon, Jan 6")
 */
export function formatDueDate(dateString: string | null | undefined): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  // Check if it's today
  if (dateOnly.getTime() === today.getTime()) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 9 && minutes === 0) {
      return 'Today';
    }
    return `Today ${formatTime(date)}`;
  }

  // Check if it's tomorrow
  if (dateOnly.getTime() === tomorrow.getTime()) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 9 && minutes === 0) {
      return 'Tomorrow';
    }
    return `Tomorrow ${formatTime(date)}`;
  }

  // Format as "Mon, Jan 6" or "Mon, Jan 6 at 2:00 PM"
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = dayNames[date.getDay()];
  const monthName = monthNames[date.getMonth()];
  const day = date.getDate();

  const hours = date.getHours();
  const minutes = date.getMinutes();

  if (hours === 9 && minutes === 0) {
    return `${dayName}, ${monthName} ${day}`;
  }

  return `${dayName}, ${monthName} ${day} at ${formatTime(date)}`;
}

/**
 * Format time (e.g., "2:00 PM", "14:30")
 */
function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;

  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dateString: string | null | undefined): boolean {
  if (!dateString) return false;

  const dueDate = new Date(dateString);
  const now = new Date();

  return dueDate < now;
}

/**
 * Check if a date is today
 */
export function isToday(dateString: string | null | undefined): boolean {
  if (!dateString) return false;

  const date = new Date(dateString);
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
