console.log("CLIPPINGS_ALIVE");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("BG_RECEIVED:", request.action);
  
  if (request.action === "SEND_TO_API") {
    const API_URL = "https://clippings-production.up.railway.app/clip";
    
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.data)
    })
    .then(r => r.json())
    .then(data => {
      console.log("BG_SUCCESS", data);
      chrome.tabs.sendMessage(sender.tab.id, { action: "CLIP_SUCCESS", title: request.data.title });
    })
    .catch(err => {
      console.error("BG_ERROR", err);
    });
  }
  return true;
});
