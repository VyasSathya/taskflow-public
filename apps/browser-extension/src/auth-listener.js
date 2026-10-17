/**
 * Auth Listener - Content script that runs on VibeTasks login page
 * Captures authentication tokens and sends them to the extension
 */

// Only run on VibeTasks auth page
if (window.location.pathname === '/cli-auth' && 
    window.location.search.includes('source=extension')) {
  
  console.log('[VibeTasks Extension] Auth listener active');
  
  // Listen for auth message from the page
  window.addEventListener('message', async (event) => {
    // Verify origin
    if (!event.origin.includes('vibetasks.vercel.app') && 
        !event.origin.includes('localhost')) {
      return;
    }
    
    const data = event.data;
    
    if (data?.type === 'VIBETASKS_AUTH') {
      console.log('[VibeTasks Extension] Received auth tokens');
      
      try {
        // Send tokens to background script
        const response = await chrome.runtime.sendMessage({
          action: 'saveAuth',
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
        
        if (response.success) {
          console.log('[VibeTasks Extension] Auth saved successfully');
          
          // Update the page to show success
          const button = document.getElementById('extension-auth-complete');
          if (button) {
            button.textContent = 'Authentication Complete! Close Tab';
            button.classList.add('bg-green-600');
          }
        }
      } catch (error) {
        console.error('[VibeTasks Extension] Failed to save auth:', error);
      }
    }
  });
  
  // Also check for tokens in page data attributes (fallback)
  const checkPageAuth = () => {
    const authButton = document.getElementById('extension-auth-complete');
    if (authButton) {
      const accessToken = authButton.dataset.accessToken;
      if (accessToken) {
        // Tokens available via data attribute
        window.postMessage({
          type: 'VIBETASKS_AUTH_READY',
        }, '*');
      }
    }
  };
  
  // Check periodically for page readiness
  const interval = setInterval(() => {
    if (document.getElementById('extension-auth-complete')) {
      checkPageAuth();
      clearInterval(interval);
    }
  }, 500);
  
  // Clean up after 30 seconds
  setTimeout(() => clearInterval(interval), 30000);
}
