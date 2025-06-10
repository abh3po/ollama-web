const OLLAMA_BASE_URL = 'http://localhost:11434';

const handleOllamaRequest = async (request, sendResponse) => {
    let endpoint = '/api/generate';
    let options = {};

    if (request.type === 'ollamaRequest') { 
        endpoint = request.endpoint;
        options = request.options;
    } else { 
        options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama3.1:latest",
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


// Listener for EXTERNAL messages (from your web app)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    console.log("Ollama Extension: Received external request from", sender.origin);
    handleOllamaRequest(request, sendResponse);
    return true; // Indicates async response
});

// Listener for INTERNAL messages (from the popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Ollama Extension: Received internal request from popup.");
    handleOllamaRequest(request, sendResponse);
    return true; // Indicates async response
});