// Store the window ID
let windowId = null;

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
  if (windowId === null) {
    // Create a new window if one doesn't exist
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 550,
      height: 700,
      focused: true
    }, (window) => {
      windowId = window.id;
    });
  } else {
    // Focus the existing window
    chrome.windows.update(windowId, {
      focused: true
    });
  }
});

// Listen for window close
chrome.windows.onRemoved.addListener((removedWindowId) => {
  if (removedWindowId === windowId) {
    windowId = null;
  }
});
