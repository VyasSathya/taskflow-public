/**
 * VibeTasks DevTools Panel
 */

// DOM Elements
const statusDot = document.getElementById('status-dot');
const authText = document.getElementById('auth-text');
const captureSection = document.getElementById('capture-section');
const loginSection = document.getElementById('login-section');
const errorInput = document.getElementById('error-input');
const projectInput = document.getElementById('project-input');
const prioritySelect = document.getElementById('priority-select');
const preview = document.getElementById('preview');
const previewTitle = document.getElementById('preview-title');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const loginBtn = document.getElementById('login-btn');
const message = document.getElementById('message');

let currentUser = null;

/**
 * Initialize the panel
 */
async function init() {
  // Check authentication status
  await checkAuth();
  
  // Set up event listeners
  errorInput.addEventListener('input', handleInputChange);
  sendBtn.addEventListener('click', handleSend);
  clearBtn.addEventListener('click', handleClear);
  loginBtn.addEventListener('click', handleLogin);
  
  // Listen for auth changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.vibetasks_access_token) {
      checkAuth();
    }
  });
}

/**
 * Check authentication status
 */
async function checkAuth() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
    
    if (response.isAuthenticated && response.user) {
      currentUser = response.user;
      showConnected();
    } else {
      currentUser = null;
      showDisconnected();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showDisconnected();
  }
}

/**
 * Show connected state
 */
function showConnected() {
  statusDot.classList.add('connected');
  authText.textContent = `Connected as ${currentUser?.email || 'user'}`;
  captureSection.classList.remove('hidden');
  loginSection.classList.add('hidden');
}

/**
 * Show disconnected state
 */
function showDisconnected() {
  statusDot.classList.remove('connected');
  authText.textContent = 'Not connected';
  captureSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
}

// Store the last parsed error for sending
let lastParsedError = null;

/**
 * Handle input changes
 */
async function handleInputChange() {
  const errorText = errorInput.value.trim();
  
  if (errorText) {
    sendBtn.disabled = false;
    
    // Parse and show preview
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'parseError',
        errorText,
      });
      
      if (response.parsed) {
        lastParsedError = response.parsed;
        preview.classList.remove('hidden');
        
        // Show generated title
        const title = generateTitle(response.parsed);
        previewTitle.textContent = title;
        
        // Show category badge if detected
        if (response.parsed.category && response.parsed.category !== 'general') {
          previewTitle.innerHTML = `<span class="category-badge">${response.parsed.category}</span> ${title}`;
        }
        
        // Auto-fill project if detected
        if (response.parsed.file_path) {
          const detectedProject = detectProject(response.parsed);
          if (detectedProject && !projectInput.value) {
            projectInput.placeholder = `Detected: ${detectedProject}`;
          }
        }
      } else {
        lastParsedError = null;
      }
    } catch {
      lastParsedError = null;
      preview.classList.add('hidden');
    }
  } else {
    sendBtn.disabled = true;
    preview.classList.add('hidden');
    lastParsedError = null;
  }
}

/**
 * Generate task title from parsed error
 */
function generateTitle(parsed) {
  const prefix = {
    nodejs: 'Fix',
    typescript: 'Fix TS',
    npm: 'Resolve npm',
    webpack: 'Fix webpack',
    vite: 'Fix Vite',
    expo: 'Fix Expo',
    python: 'Fix Python',
    rust: 'Fix Rust',
    go: 'Fix Go',
    general: 'Fix',
  };

  const category = parsed.category || 'general';
  let title = `${prefix[category] || 'Fix'} ${parsed.error_type || 'error'}`;
  
  if (parsed.message) {
    const snippet = parsed.message.substring(0, 50);
    title += `: ${snippet}`;
    if (parsed.message.length > 50) title += '...';
  }
  
  return title.substring(0, 80);
}

/**
 * Detect project from file path in error
 */
function detectProject(parsed) {
  if (!parsed.file_path) return null;
  
  const patterns = [
    /apps\/([^/]+)/,
    /packages\/([^/]+)/,
    /src\/([^/]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = parsed.file_path.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Handle send button click
 */
async function handleSend() {
  const errorText = errorInput.value.trim();
  if (!errorText) return;
  
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span>Sending...</span>';
  hideMessage();
  
  try {
    // Use the already parsed error or parse fresh
    let errorContext = lastParsedError;
    if (!errorContext) {
      const parseResponse = await chrome.runtime.sendMessage({
        action: 'parseError',
        errorText,
      });
      errorContext = parseResponse.parsed;
    }
    
    // Generate title and notes
    const title = errorContext 
      ? generateTitle(errorContext)
      : `Fix error: ${errorText.split('\n')[0].substring(0, 70)}`;
    
    const notes = formatErrorNotes(errorContext, errorText);
    
    // Determine project
    const project = projectInput.value.trim() || 
      (errorContext ? detectProject(errorContext) : null);
    
    // Create task with error_context
    const response = await chrome.runtime.sendMessage({
      action: 'createTask',
      taskData: {
        title,
        notes,
        priority: prioritySelect.value,
        project,
        source_type: 'browser_extension',
        error_context: errorContext,
      },
    });
    
    if (response.success) {
      showMessage('Error captured! Task created in VibeTasks.', 'success');
      handleClear();
    } else {
      throw new Error(response.error || 'Failed to create task');
    }
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<span>Send to VibeTasks</span>';
  }
}

/**
 * Format error as markdown notes
 */
function formatErrorNotes(errorContext, rawText) {
  let notes = '';
  
  if (errorContext) {
    // Add metadata header
    if (errorContext.file_path || errorContext.error_type) {
      notes += '## Error Details\n\n';
      if (errorContext.category && errorContext.category !== 'general') {
        notes += `**Category:** ${errorContext.category}\n`;
      }
      if (errorContext.error_type) {
        notes += `**Type:** ${errorContext.error_type}\n`;
      }
      if (errorContext.file_path) {
        notes += `**File:** \`${errorContext.file_path}\``;
        if (errorContext.line_number) {
          notes += `:${errorContext.line_number}`;
        }
        notes += '\n';
      }
      notes += '\n';
    }
    
    // Add suggestion if available
    if (errorContext.suggestion) {
      notes += '## Suggestion\n\n';
      notes += `${errorContext.suggestion}\n\n`;
    }
  }
  
  // Add raw error in code block
  notes += '## Stack Trace\n\n';
  notes += '```\n';
  notes += (errorContext?.raw_text || rawText).trim();
  notes += '\n```\n';
  
  // Add capture metadata
  notes += '\n---\n';
  notes += `*Captured via VibeTasks DevTools Panel on ${new Date().toLocaleString()}*\n`;
  
  return notes;
}

/**
 * Handle clear button click
 */
function handleClear() {
  errorInput.value = '';
  projectInput.value = '';
  projectInput.placeholder = 'Auto-detect from page';
  prioritySelect.value = 'high';
  preview.classList.add('hidden');
  sendBtn.disabled = true;
  lastParsedError = null;
  hideMessage();
}

/**
 * Handle login button click
 */
function handleLogin() {
  // Open the extension popup for login
  chrome.runtime.sendMessage({ action: 'openPopup' });
  
  // Also open VibeTasks web app
  chrome.tabs.create({
    url: 'https://vibetasks.vercel.app/login?extension=true',
  });
}

/**
 * Show a message
 */
function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
  message.classList.remove('hidden');
}

/**
 * Hide the message
 */
function hideMessage() {
  message.classList.add('hidden');
}

// Initialize
init();
