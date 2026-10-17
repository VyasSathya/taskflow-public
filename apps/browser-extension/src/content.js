/**
 * VibeTasks Extension - Content Script
 * 
 * Runs on all pages to:
 * - Capture console errors
 * - Show toast notifications
 * - Handle selection context
 */

// Store console errors for this page
const consoleErrors = [];
const MAX_ERRORS = 50;

// Override console.error to capture errors
const originalConsoleError = console.error;
console.error = function(...args) {
  // Call original
  originalConsoleError.apply(console, args);
  
  // Capture the error
  const errorText = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  
  consoleErrors.push({
    text: errorText,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  });
  
  // Keep only last N errors
  if (consoleErrors.length > MAX_ERRORS) {
    consoleErrors.shift();
  }
};

// Capture unhandled errors
window.addEventListener('error', (event) => {
  const errorText = `${event.message}\n  at ${event.filename}:${event.lineno}:${event.colno}`;
  consoleErrors.push({
    text: errorText,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  });
  
  if (consoleErrors.length > MAX_ERRORS) {
    consoleErrors.shift();
  }
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  let errorText = 'Unhandled Promise Rejection: ';
  
  if (event.reason instanceof Error) {
    errorText += `${event.reason.name}: ${event.reason.message}\n${event.reason.stack || ''}`;
  } else {
    errorText += String(event.reason);
  }
  
  consoleErrors.push({
    text: errorText,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  });
  
  if (consoleErrors.length > MAX_ERRORS) {
    consoleErrors.shift();
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getConsoleErrors':
      sendResponse({ 
        errors: consoleErrors.map(e => `[${e.timestamp}]\n${e.text}`),
        count: consoleErrors.length,
      });
      break;
      
    case 'showToast':
      showToast(message.message, message.type);
      sendResponse({ success: true });
      break;
      
    case 'getSelectedText':
      sendResponse({ text: window.getSelection()?.toString() || '' });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  return true;
});

/**
 * Show a toast notification on the page
 */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.getElementById('vibetasks-toast');
  if (existing) {
    existing.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'vibetasks-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: white;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  // Add icon
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `
    <span style="font-size: 16px;">${icon}</span>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// Inject CSS for toast
const style = document.createElement('style');
style.textContent = `
  #vibetasks-toast {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  }
`;
document.head.appendChild(style);

console.log('[VibeTasks] Error capture initialized');
