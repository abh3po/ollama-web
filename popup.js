document.getElementById("sendButton").addEventListener("click", sendPrompt);

function sendPrompt() {
  const promptInput = document.getElementById("prompt");
  const prompt = promptInput.value;
  const responseDiv = document.getElementById("response");
  const loadingDiv = document.getElementById("loading");

  if (!prompt) {
    responseDiv.innerText = "Please enter a prompt.";
    return;
  }

  responseDiv.innerText = "";
  loadingDiv.style.display = "block";

  chrome.runtime.sendMessage(
    { type: "sendToOllama", prompt: prompt },
    (response) => {
      loadingDiv.style.display = "none";

      if (chrome.runtime.lastError) {
        responseDiv.innerText = `Error: ${chrome.runtime.lastError.message}. Please reload the extension.`;
        return;
      }
      
      if (!response) {
        responseDiv.innerText = "Error: Received no response from the background script.";
        return;
      }

      if (response.success) {
        responseDiv.innerText = response.data.response || "No response received.";
      } else {
        responseDiv.innerText = `Error: ${response.error}. Ensure Ollama is running and accessible.`;
      }
    }
  );
}