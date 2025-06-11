const OLLAMA_BASE_URL = 'http://localhost:11434';

const handleOllamaRequest = async (request, sendResponse) => {
    let endpoint = '/api/generate';
    let options = {};

    if (request.type === 'fetchModels') {
        endpoint = '/api/tags';
        options = { method: 'GET' };
    } else if (request.type === 'ollamaRequest') { 
        endpoint = request.endpoint;
        options = request.options;
    } else { 
        options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: request.model || "llama3.1:latest",
                prompt: request.prompt,
                stream: false,
            }),
        };
    }

    const url = new URL(endpoint, OLLAMA_BASE_URL).href;
    console.log("Ollama Extension: Forwarding request to", url);

    try {
        const fetchOptions = {
            method: options.method,
            headers: options.headers,
            body: options.body,
        };

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        const data = endpoint === '/' ? await response.text() : await response.json();
        sendResponse({ success: true, data: data });

    } catch (error) {
        console.error("Ollama Extension: Fetch error:", error.message);
        sendResponse({ success: false, error: error.message });
    }
};

// Domain management
const defaultDomains = [];
let allowedDomains = [];

chrome.storage.sync.get("allowedDomains", (data) => {
  allowedDomains = data.allowedDomains || defaultDomains;
  console.log("Ollama Extension: Loaded allowedDomains:", allowedDomains);
});

function updateDomains(domains, callback) {
  allowedDomains = domains;
  chrome.storage.sync.set({ allowedDomains }, () => {
    console.log("Ollama Extension: Updated allowedDomains:", allowedDomains);
    if (callback) callback();
  });
}

// Listener for EXTERNAL messages (from web apps)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  const senderOrigin = sender.url ? new URL(sender.url).origin + "/*" : "";
  console.log("Ollama Extension: Received external request from", senderOrigin);
  if (!allowedDomains.includes("*://*/*") && !allowedDomains.includes(senderOrigin)) {
    // console.error("Ollama Extension: Unauthorized domain", senderOrigin, "Allowed:", allowedDomains);
    sendResponse({ success: false, error: "Unauthorized domain" });
    return true;
  }
  handleOllamaRequest(request, sendResponse);
  return true; // Indicates async response
});

// Listener for INTERNAL messages (from the popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Ollama Extension: Received internal request:", request.type);
  if (request.type === "getDomains") {
    sendResponse({ domains: allowedDomains });
  } else if (request.type === "addDomain") {
    const domainPattern = /^(\*:\/\/)?([*a-zA-Z0-9.-]+)(\/\*)?$/;
    if (request.domain && domainPattern.test(request.domain)) {
      if (!allowedDomains.includes(request.domain)) {
        updateDomains([...allowedDomains, request.domain], () => sendResponse({ success: true }));
      } else {
        sendResponse({ success: true });
      }
    } else {
      sendResponse({ success: false, error: "Invalid domain format" });
    }
  } else if (request.type === "addCurrentDomain") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        const domain = new URL(tabs[0].url).origin + "/*";
        if (!allowedDomains.includes(domain)) {
          updateDomains([...allowedDomains, domain], () => sendResponse({ success: true }));
        } else {
          sendResponse({ success: true });
        }
      } else {
        sendResponse({ success: false, error: "No active tab URL" });
      }
    });
  } else if (request.type === "allowAllDomains") {
    updateDomains(["*://*/*"], () => sendResponse({ success: true }));
  } else if (request.type === "removeDomain") {
    updateDomains(allowedDomains.filter(d => d !== request.domain), () => sendResponse({ success: true }));
  } else {
    handleOllamaRequest(request, sendResponse);
  }
  return true; // Indicates async response
});