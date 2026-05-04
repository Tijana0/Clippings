// background.js
console.log("Clippings Background Service Worker active.");

chrome.commands.onCommand.addListener((command) => {
  if (command === "clip-item") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "CLIP_REQUEST" });
      }
    });
  }
});

// The content script now handles the API call directly.
