/**
 * VibeTasks Extension Configuration
 */

export const CONFIG = {
  // Supabase Configuration
  SUPABASE_URL: 'https://your-project-ref.supabase.co', // set to your Supabase project URL
  SUPABASE_ANON_KEY: 'your-supabase-anon-key', // set to your Supabase anon key
  
  // VibeTasks Web App URL (for auth redirect)
  WEB_APP_URL: 'https://vibetasks.vercel.app',
  
  // Extension storage keys
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'vibetasks_access_token',
    REFRESH_TOKEN: 'vibetasks_refresh_token',
    USER: 'vibetasks_user',
    SETTINGS: 'vibetasks_settings',
  },
  
  // Default settings
  DEFAULT_SETTINGS: {
    defaultProject: '',
    autoDetectProject: true,
    showNotifications: true,
    captureStackTrace: true,
  },
};

/**
 * Get stored authentication tokens
 */
export async function getAuthTokens() {
  const result = await chrome.storage.local.get([
    CONFIG.STORAGE_KEYS.ACCESS_TOKEN,
    CONFIG.STORAGE_KEYS.REFRESH_TOKEN,
    CONFIG.STORAGE_KEYS.USER,
  ]);
  
  return {
    accessToken: result[CONFIG.STORAGE_KEYS.ACCESS_TOKEN] || null,
    refreshToken: result[CONFIG.STORAGE_KEYS.REFRESH_TOKEN] || null,
    user: result[CONFIG.STORAGE_KEYS.USER] || null,
  };
}

/**
 * Save authentication tokens
 */
export async function saveAuthTokens(accessToken, refreshToken, user) {
  await chrome.storage.local.set({
    [CONFIG.STORAGE_KEYS.ACCESS_TOKEN]: accessToken,
    [CONFIG.STORAGE_KEYS.REFRESH_TOKEN]: refreshToken,
    [CONFIG.STORAGE_KEYS.USER]: user,
  });
}

/**
 * Clear authentication tokens
 */
export async function clearAuthTokens() {
  await chrome.storage.local.remove([
    CONFIG.STORAGE_KEYS.ACCESS_TOKEN,
    CONFIG.STORAGE_KEYS.REFRESH_TOKEN,
    CONFIG.STORAGE_KEYS.USER,
  ]);
}

/**
 * Get extension settings
 */
export async function getSettings() {
  const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.SETTINGS);
  return {
    ...CONFIG.DEFAULT_SETTINGS,
    ...result[CONFIG.STORAGE_KEYS.SETTINGS],
  };
}

/**
 * Save extension settings
 */
export async function saveSettings(settings) {
  await chrome.storage.local.set({
    [CONFIG.STORAGE_KEYS.SETTINGS]: settings,
  });
}
