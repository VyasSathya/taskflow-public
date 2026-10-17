/**
 * Supabase Client for Browser Extension
 * Lightweight implementation that works without the full SDK
 * 
 * Supports the new error_context field for structured error tracking.
 */

import { CONFIG, getAuthTokens, saveAuthTokens, clearAuthTokens } from './config.js';

/**
 * Make authenticated request to Supabase
 */
async function supabaseRequest(endpoint, options = {}) {
  const { accessToken } = await getAuthTokens();
  
  const url = `${CONFIG.SUPABASE_URL}${endpoint}`;
  const headers = {
    'apikey': CONFIG.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || error.error_description || 'Request failed');
  }
  
  return response.json();
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken() {
  const { refreshToken } = await getAuthTokens();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  
  if (!response.ok) {
    await clearAuthTokens();
    throw new Error('Session expired. Please log in again.');
  }
  
  const data = await response.json();
  await saveAuthTokens(data.access_token, data.refresh_token, data.user);
  
  return data.access_token;
}

/**
 * Create a new task in VibeTasks
 * 
 * Supports:
 * - error_context: Structured error information (ErrorContext)
 * - source_type: Where the task came from ('browser_extension')
 * 
 * @param {Object} taskData - Task creation data
 * @param {string} taskData.title - Task title
 * @param {string} [taskData.notes] - Task notes (markdown)
 * @param {string} [taskData.priority] - Priority level
 * @param {string} [taskData.project] - Project tag
 * @param {string} [taskData.source_type] - Source type (defaults to 'browser_extension')
 * @param {Object} [taskData.error_context] - Structured error context
 * @param {string} [taskData.context] - Additional context notes
 */
export async function createTask(taskData) {
  const { accessToken, user } = await getAuthTokens();
  
  if (!accessToken || !user) {
    throw new Error('Please log in to VibeTasks first');
  }
  
  try {
    const task = {
      user_id: user.id,
      title: taskData.title,
      notes: taskData.notes || '',
      notes_format: 'markdown',
      status: 'todo',
      priority: taskData.priority || 'high',
      project_tag: taskData.project || null,
      created_by: 'human',
      context_notes: taskData.context || null,
      position: 0,
      // New fields for error tracking
      source_type: taskData.source_type || 'browser_extension',
      // Store error_context as JSONB
      error_context: taskData.error_context ? sanitizeErrorContext(taskData.error_context) : null,
    };
    
    const result = await supabaseRequest('/rest/v1/tasks', {
      method: 'POST',
      headers: {
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(task),
    });
    
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    // Try refreshing the token and retry
    if (error.message.includes('JWT') || error.message.includes('401')) {
      try {
        await refreshAccessToken();
        return createTask(taskData); // Retry
      } catch (refreshError) {
        throw new Error('Session expired. Please log in again.');
      }
    }
    throw error;
  }
}

/**
 * Sanitize error context before sending to API
 * Ensures the data is valid JSON and within size limits
 */
function sanitizeErrorContext(errorContext) {
  if (!errorContext) return null;
  
  // Create a clean copy with only the expected fields
  const sanitized = {
    raw_text: truncate(errorContext.raw_text, 10000), // Limit raw text to 10KB
    error_type: errorContext.error_type,
    message: truncate(errorContext.message, 500),
    category: errorContext.category,
    file_path: errorContext.file_path,
    line_number: errorContext.line_number,
    column: errorContext.column,
    stack_trace: truncate(errorContext.stack_trace, 5000), // Limit stack trace to 5KB
    suggestion: errorContext.suggestion,
    captured_at: errorContext.captured_at || new Date().toISOString(),
    capture_source: 'browser', // Always 'browser' from extension
  };
  
  // Remove undefined values
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  
  return sanitized;
}

/**
 * Truncate string to max length
 */
function truncate(str, maxLength) {
  if (!str) return str;
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const { accessToken, user } = await getAuthTokens();
  
  if (!accessToken || !user) {
    return null;
  }
  
  // Verify the token is still valid
  try {
    const response = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      // Try to refresh
      try {
        await refreshAccessToken();
        const { user: refreshedUser } = await getAuthTokens();
        return refreshedUser;
      } catch {
        return null;
      }
    }
    
    return user;
  } catch {
    return null;
  }
}

/**
 * Sign out
 */
export async function signOut() {
  const { accessToken } = await getAuthTokens();
  
  if (accessToken) {
    try {
      await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    } catch {
      // Ignore errors during logout
    }
  }
  
  await clearAuthTokens();
}
