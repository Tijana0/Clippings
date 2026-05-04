// popup.js

document.getElementById('clipBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.innerText = "Clipping...";

  // Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab?.id) {
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: "CLIP_REQUEST" }, (response) => {
      if (chrome.runtime.lastError) {
        status.innerText = "Error: Refresh the page!";
        console.error(chrome.runtime.lastError);
      } else {
        status.innerText = "Clipped! ✨ Check dashboard.";
        setTimeout(() => window.close(), 1500); // Close popup after success
      }
    });
  }
});
