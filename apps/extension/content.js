// content.js

console.log("Clippings extension loaded.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  if (request.action === "CLIP_REQUEST") {
    const data = clipPage();
    if (data) {
      console.log("Clipping data extracted, sending to API directly...");
      
      // Update this URL with your Railway/Render URL once deployed!
      const API_URL = "https://your-app-name.railway.app/clip";
      
      fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      .then(response => response.json())
      .then(result => {
        console.log("API Success:", result);
        showFeedback(data.title);
        sendResponse({ status: "success" });
      })
      .catch(err => {
        console.error("API Error from Content Script:", err);
        alert("API Error: Make sure your Python server is running at http://127.0.0.1:8000");
        sendResponse({ status: "error", error: err });
      });
    }
  }
  return true;
});

function clipPage() {
  const metadata = extractMetadata();
  const heroImage = findHeroImage();

  if (!heroImage) {
    alert("Couldn't find a product image to clip!");
    return null;
  }

  return {
    title: metadata.title || document.title,
    image_url: heroImage,
    price: metadata.price,
    currency: metadata.currency || 'USD',
    original_url: window.location.href,
    raw_metadata: metadata
  };
}

function extractMetadata() {
  let data = {};
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  
  scripts.forEach(script => {
    try {
      const json = JSON.parse(script.innerText);
      // Handle array or single object
      const items = Array.isArray(json) ? json : [json];
      
      items.forEach(item => {
        // Look for Product type
        if (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
          data.title = item.name;
          if (item.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            data.price = parseFloat(offer.price);
            data.currency = offer.priceCurrency;
          }
        }
      });
    } catch (e) {
      // Ignore parsing errors
    }
  });

  return data;
}

function findHeroImage() {
  // 1. Try to get from OpenGraph
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) return ogImage.content;

  // 2. Try to get from Twitter Card
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (twitterImage) return twitterImage.content;

  // 3. Heuristic: Find the largest image in the viewport or with "product" in class/id
  const images = Array.from(document.getElementsByTagName('img'));
  const productImages = images.filter(img => 
    img.src && 
    (img.className.toLowerCase().includes('product') || 
     img.id.toLowerCase().includes('product') ||
     img.src.toLowerCase().includes('product'))
  );

  if (productImages.length > 0) {
    // Return the one with biggest area
    return productImages.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0].src;
  }

  return null;
}

function showFeedback(title) {
  const toast = document.createElement('div');
  toast.innerText = `Clipped: ${title}! ✨`;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = '#8C4637'; // brown
  toast.style.color = '#F2F2DF'; // cream
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.fontFamily = 'sans-serif';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = 'bold';
  toast.style.zIndex = '999999';
  toast.style.boxShadow = '4px 4px 0px 0px #F2A7C3'; // pink shadow
  toast.style.border = '2px solid #F2F2DF';
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s ease';
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 2500);
}
