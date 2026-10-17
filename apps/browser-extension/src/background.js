/**
 * VibeTasks Extension - Background Service Worker
 * 
 * Handles:
 * - Context menu creation and clicks
 * - Communication between DevTools panel and popup
 * - Task creation via Supabase with error_context
 */

import { CONFIG, getAuthTokens, saveAuthTokens, getSettings } from './config.js';
import { createTask, getCurrentUser } from './supabase.js';
import { parseError, generateErrorTaskTitle, detectProjectFromError, formatErrorAsNotes } from './error-parser.js';

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('VibeTasks Extension installed');
  
  // Create context menu for selected text
  chrome.contextMenus.create({
    id: 'vibetasks-send-error',
    title: 'Send to VibeTasks',
    contexts: ['selection'],
  });
  
  // Create context menu for page (captures console errors)
  chrome.contextMenus.create({
    id: 'vibetasks-capture-page',
    title: 'Capture page errors to VibeTasks',
    contexts: ['page'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'vibetasks-send-error') {
    const selectedText = info.selectionText;
    if (selectedText) {
      await handleErrorCapture(selectedText, tab);
    }
  } else if (info.menuItemId === 'vibetasks-capture-page') {
    // Request console errors from content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'getConsoleErrors' 
      });
      
      if (response?.errors?.length > 0) {
        const combinedErrors = response.errors.join('\n\n---\n\n');
        await handleErrorCapture(combinedErrors, tab);
      } else {
        showNotification('No Errors', 'No console errors captured on this page.');
      }
    } catch (error) {
      console.error('Failed to get console errors:', error);
      showNotification('Error', 'Could not capture page errors. Try refreshing the page.');
    }
  }
});

// Handle messages from popup, devtools, and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((error) => {
    console.error('Message handling error:', error);
    sendResponse({ success: false, error: error.message });
  });
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.action) {
    case 'captureError':
      return handleErrorCapture(message.errorText, sender.tab);
      
    case 'createTask':
      return handleCreateTask(message.taskData);
      
    case 'getUser':
      return { user: await getCurrentUser() };
      
    case 'checkAuth':
      const user = await getCurrentUser();
      return { isAuthenticated: !!user, user };
      
    case 'saveAuth':
      await saveAuthTokens(
        message.accessToken,
        message.refreshToken,
        message.user
      );
      return { success: true };
      
    case 'logout':
      const { signOut } = await import('./supabase.js');
      await signOut();
      return { success: true };
      
    case 'getSettings':
      return { settings: await getSettings() };
      
    case 'parseError':
      return { parsed: parseError(message.errorText) };
      
    default:
      throw new Error(`Unknown action: ${message.action}`);
  }
}

/**
 * Handle error capture from various sources
 * Creates a task with proper error_context and source_type
 */
async function handleErrorCapture(errorText, tab) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      showNotification('Not Logged In', 'Please log in to VibeTasks first.');
      // Open popup for login
      chrome.action.openPopup();
      return { success: false, error: 'Not authenticated' };
    }
    
    // Parse the error into structured ErrorContext
    const errorContext = parseError(errorText);
    
    // Get settings for default project
    const settings = await getSettings();
    
    // Determine project tag
    let project = errorContext ? detectProjectFromError(errorContext) : null;
    
    // Auto-detect project from URL if enabled
    if (!project && settings.autoDetectProject && tab?.url) {
      try {
        const url = new URL(tab.url);
        // Use hostname as project hint
        project = url.hostname.replace(/^www\./, '').split('.')[0];
        if (project === 'localhost') {
          project = 'local';
        }
      } catch {
        // Ignore URL parsing errors
      }
    }
    
    // Use default project from settings if still no project
    if (!project && settings.defaultProject) {
      project = settings.defaultProject;
    }
    
    // Generate task title
    const title = errorContext 
      ? generateErrorTaskTitle(errorContext)
      : `Fix error: ${errorText.split('\n')[0].substring(0, 70)}`;
    
    // Format notes with full error details
    const notes = errorContext 
      ? formatErrorAsNotes(errorContext)
      : formatPlainErrorNotes(errorText, tab?.url);
    
    // Create the task with error_context
    const task = await createTask({
      title,
      notes,
      priority: 'high',
      project,
      source_type: 'browser_extension',
      error_context: errorContext,
      context: `Captured from: ${tab?.url || 'DevTools Console'}`,
    });
    
    // Show success notification
    if (settings.showNotifications) {
      showNotification(
        'Error Captured!',
        `Task created: ${title.slice(0, 50)}...`
      );
    }
    
    // Send toast to content script
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showToast',
          message: 'Error sent to VibeTasks!',
          type: 'success',
        });
      } catch {
        // Content script not available
      }
    }
    
    return { success: true, task };
  } catch (error) {
    console.error('Error capture failed:', error);
    showNotification('Capture Failed', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Format plain error text as notes (fallback when parsing fails)
 */
function formatPlainErrorNotes(errorText, url) {
  let notes = '## Error\n\n```\n';
  notes += errorText.trim();
  notes += '\n```\n';
  
  if (url) {
    notes += `\n**Source:** ${url}\n`;
  }
  
  notes += '\n---\n';
  notes += `*Captured via VibeTasks Browser Extension on ${new Date().toLocaleString()}*\n`;
  
  return notes;
}

/**
 * Handle task creation request
 */
async function handleCreateTask(taskData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Please log in to VibeTasks first');
    }
    
    // Ensure source_type is set for all tasks from extension
    const task = await createTask({
      ...taskData,
      source_type: taskData.source_type || 'browser_extension',
    });
    return { success: true, task };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Show a notification
 */
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: `VibeTasks: ${title}`,
    message,
  });
}
