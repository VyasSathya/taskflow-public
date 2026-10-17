/**
 * VibeTasks Extension - DevTools Integration
 * 
 * Creates a sidebar panel in the Console that allows
 * users to send errors directly to VibeTasks
 */

// Create a panel in the Console sidebar
chrome.devtools.panels.elements.createSidebarPane(
  'VibeTasks',
  (sidebar) => {
    sidebar.setPage('src/devtools-panel.html');
  }
);

// Also create a dedicated panel
chrome.devtools.panels.create(
  'VibeTasks',
  'icons/icon48.png',
  'src/devtools-panel.html',
  (panel) => {
    console.log('VibeTasks DevTools panel created');
  }
);
