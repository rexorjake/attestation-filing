// PASTE YOUR NEW API URL HERE
const API_URL = 'https://script.google.com/macros/s/AKfycbzYzEBZ8OTcfmZAE4UDITR5k_DsxbcA4IbARdj54LOuZHrBcc6Fs8n3UVk4cnpz41aO/exec';

// This function runs when the page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log("Page loaded. Attempting to call the API...");

  // We will call the API with a simple path
  const testUrl = `${API_URL}?path=test`;

  fetch(testUrl)
    .then(response => {
      console.log("Got a response from the server. Status:", response.status);
      return response.text();
    })
    .then(responseText => {
      console.log("Raw response text:", responseText);
      // Try to extract the JSON
      const jsonString = responseText.match(/<script>(.*?)<\/script>/)[1];
      const data = JSON.parse(jsonString);
      console.log("SUCCESS! Parsed data:", data);
    })
    .catch(error => {
      console.error("FAILURE! The test failed with this error:", error);
    });
});
