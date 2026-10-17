/**
 * VibeTasks Extension - Popup Script
 */

import { CONFIG, getSettings, saveSettings } from './config.js';

// DOM Elements
const loadingEl = document.getElementById('loading');
const loggedInEl = document.getElementById('logged-in');
const loggedOutEl = document.getElementById('logged-out');
const userAvatarEl = document.getElementById('user-avatar');
const userEmailEl = document.getElementById('user-email');
const quickErrorEl = document.getElementById('quick-error');
const quickSendBtn = document.getElementById('quick-send-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// Settings elements
const notificationsToggle = document.getElementById('setting-notifications');
const autodetectToggle = document.getElementById('setting-autodetect');
const projectInput = document.getElementById('setting-project');

let currentUser = null;

/**
 * Initialize popup
 */
async function init() {
  await checkAuth();
  await loadSettings();
  setupEventListeners();
}

/**
 * Check authentication status
 */
async function checkAuth() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
    
    loadingEl.classList.add('hidden');
    
    if (response.isAuthenticated && response.user) {
      currentUser = response.user;
      showLoggedIn();
    } else {
      showLoggedOut();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    loadingEl.classList.add('hidden');
    showLoggedOut();
  }
}

/**
 * Show logged in state
 */
function showLoggedIn() {
  loggedInEl.classList.remove('hidden');
  loggedOutEl.classList.add('hidden');
  
  // Update user info
  if (currentUser) {
    const email = currentUser.email || 'User';
    userEmailEl.textContent = email;
    userAvatarEl.textContent = email.charAt(0).toUpperCase();
  }
}

/**
 * Show logged out state
 */
function showLoggedOut() {
  loggedInEl.classList.add('hidden');
  loggedOutEl.classList.remove('hidden');
}

/**
 * Load settings
 */
async function loadSettings() {
  const settings = await getSettings();
  
  notificationsToggle.checked = settings.showNotifications;
  autodetectToggle.checked = settings.autoDetectProject;
  projectInput.value = settings.defaultProject || '';
}

/**
 * Save settings
 */
async function saveCurrentSettings() {
  await saveSettings({
    showNotifications: notificationsToggle.checked,
    autoDetectProject: autodetectToggle.checked,
    defaultProject: projectInput.value.trim(),
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Quick capture
  quickErrorEl.addEventListener('input', () => {
    quickSendBtn.disabled = !quickErrorEl.value.trim();
  });
  
  quickSendBtn.addEventListener('click', handleQuickSend);
  
  // Auth
  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  
  // Settings
  notificationsToggle.addEventListener('change', saveCurrentSettings);
  autodetectToggle.addEventListener('change', saveCurrentSettings);
  projectInput.addEventListener('blur', saveCurrentSettings);
  
  // Listen for storage changes (auth from other tabs)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes[CONFIG.STORAGE_KEYS.ACCESS_TOKEN]) {
      checkAuth();
    }
  });
}

/**
 * Handle quick send
 */
async function handleQuickSend() {
  const errorText = quickErrorEl.value.trim();
  if (!errorText) return;
  
  quickSendBtn.disabled = true;
  quickSendBtn.textContent = 'Sending...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'captureError',
      errorText,
    });
    
    if (response.success) {
      quickErrorEl.value = '';
      quickSendBtn.textContent = 'Sent!';
      
      setTimeout(() => {
        quickSendBtn.textContent = 'Send Error';
        quickSendBtn.disabled = true;
      }, 2000);
    } else {
      throw new Error(response.error || 'Failed to send error');
    }
  } catch (error) {
    console.error('Quick send failed:', error);
    quickSendBtn.textContent = 'Failed';
    
    setTimeout(() => {
      quickSendBtn.textContent = 'Send Error';
      quickSendBtn.disabled = !quickErrorEl.value.trim();
    }, 2000);
  }
}

/**
 * Handle login
 */
function handleLogin() {
  // Open login page with extension callback
  chrome.tabs.create({
    url: `${CONFIG.WEB_APP_URL}/cli-auth?source=extension`,
  });
}

/**
 * Handle logout
 */
async function handleLogout() {
  logoutBtn.textContent = 'Signing out...';
  logoutBtn.disabled = true;
  
  try {
    await chrome.runtime.sendMessage({ action: 'logout' });
    currentUser = null;
    showLoggedOut();
  } catch (error) {
    console.error('Logout failed:', error);
  }
  
  logoutBtn.textContent = 'Sign Out';
  logoutBtn.disabled = false;
}

// Initialize
init();
