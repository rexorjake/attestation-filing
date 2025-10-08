// =================== CONFIGURATION ===================
// PASTE YOUR API URL FROM THE APPS SCRIPT DEPLOYMENT STEP HERE
const API_URL = 'https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec';

// =================== GLOBAL VARIABLES ===================
let allNames = [];
let selectedIndex = -1;
let currentRecordName = '';

// =================== API CALLING FUNCTIONS ===================

// Function to call the API
async function callApi(path, method = 'GET', data = null) {
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
  }

  const url = method === 'GET' ? `${API_URL}?path=${path}&${new URLSearchParams(data)}` : `${API_URL}?path=${path}`;

  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Modified functions to use the API
function performSearch() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  if (!searchTerm) {
    showResults([{error: "Please enter a name to search"}]);
    return;
  }
  hideAutocomplete();
  showLoading();
  
  callApi('search', 'GET', { term: searchTerm })
    .then(data => showResults(data))
    .catch(error => showResults([{error: "Failed to connect to the server. Please try again."}]));
}

function submitPullOutForm() {
  const formData = {
    name: document.getElementById('pullOutName').value,
    action: 'Pull Out',
    pulledOutBy: document.getElementById('pulledOutBy').value,
    date: document.getElementById('pullOutDate').value,
    remarks: document.getElementById('pullOutRemarks').value,
    personInCharge: document.getElementById('personInCharge').value
  };
  if (!formData.pulledOutBy || !formData.date || !formData.personInCharge) {
    alert('Please fill in all required fields');
    return;
  }

  const submitButton = document.querySelector('#pullOutForm button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Submitting...';
  submitButton.disabled = true;

  callApi('logAction', 'POST', formData)
    .then(response => {
      if (response.error) alert('Error: ' + response.error);
      else {
        closeModal('pullOutModal');
        showSuccessMessage('File pulled out successfully!');
        performSearch();
      }
    })
    .catch(error => alert('Failed to connect to the server. Please try again.'))
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

function submitReturnForm() {
  const formData = {
    name: document.getElementById('returnName').value,
    action: 'Return',
    pulledOutBy: document.getElementById('returnedBy').value,
    date: document.getElementById('returnDate').value,
    remarks: document.getElementById('returnRemarks').value
  };
  if (!formData.pulledOutBy || !formData.date) {
    alert('Please fill in all required fields');
    return;
  }

  const submitButton = document.querySelector('#returnForm button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Submitting...';
  submitButton.disabled = true;

  callApi('logAction', 'POST', formData)
    .then(response => {
      if (response.error) alert('Error: ' + response.error);
      else {
        closeModal('returnModal');
        showSuccessMessage('File returned successfully!');
        performSearch();
      }
    })
    .catch(error => alert('Failed to connect to the server. Please try again.'))
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

function submitNoteForm() {
  const name = document.getElementById('noteName').value;
  const noteText = document.getElementById('noteText').value;
  if (!noteText) {
    alert('Please enter a note');
    return;
  }

  const submitButton = document.querySelector('#noteForm button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Saving...';
  submitButton.disabled = true;

  callApi('updateNote', 'POST', { name: name, note: noteText })
    .then(response => {
      if (response.error) alert('Error: ' + response.error);
      else {
        closeModal('noteModal');
        showSuccessMessage('Note saved successfully!');
        performSearch();
      }
    })
    .catch(error => alert('Failed to connect to the server. Please try again.'))
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

function deleteNote(name) {
  callApi('updateNote', 'POST', { name: name, note: '' })
    .then(response => {
      if (response.error) alert('Error: ' + response.error);
      else {
        showSuccessMessage('Note deleted successfully!');
        performSearch();
      }
    })
    .catch(error => alert('Failed to connect to the server. Please try again.'));
}


// =================== INITIALIZATION AND EVENT LISTENERS ===================
document.addEventListener('DOMContentLoaded', function() {
  // Load names for autocomplete
  callApi('getSuggestions')
    .then(response => {
      if (response.error) console.error('Error loading names:', response.error);
      else allNames = response.names || [];
    });

  // Set up event listeners
  document.getElementById('searchButton').addEventListener('click', performSearch);
  document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      if (selectedIndex >= 0) selectAutocompleteItem(selectedIndex);
      else performSearch();
    } else if (e.key === 'ArrowDown') { e.preventDefault(); navigateAutocomplete(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); navigateAutocomplete(-1); }
    else if (e.key === 'Escape') hideAutocomplete();
  });

  let debounceTimer;
  document.getElementById('searchInput').addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const value = this.value.trim();
      if (value.length > 0) showAutocomplete(value);
      else hideAutocomplete();
    }, 300);
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) hideAutocomplete();
  });

  // Form submissions
  document.getElementById('pullOutForm').addEventListener('submit', e => { e.preventDefault(); submitPullOutForm(); });
  document.getElementById('returnForm').addEventListener('submit', e => { e.preventDefault(); submitReturnForm(); });
  document.getElementById('noteForm').addEventListener('submit', e => { e.preventDefault(); submitNoteForm(); });
  
  // Set default dates
  document.getElementById('pullOutDate').valueAsDate = new Date();
  document.getElementById('returnDate').valueAsDate = new Date();
});


// =================== PASTE ALL YOUR OTHER JAVASCRIPT FUNCTIONS HERE ===================
// Copy all your remaining functions from your original script.
// These functions do not need to be changed as they only manipulate the UI.
// Examples: showResults, showLoading, openPullOutModal, closeModal, showAutocomplete, etc.

function showResults(response) { /* ... your original code ... */ }
function showLoading() { /* ... your original code ... */ }
function openPullOutModal(name) { /* ... your original code ... */ }
function openReturnModal(name) { /* ... your original code ... */ }
function openNoteModal(name, action, noteText = '') { /* ... your original code ... */ }
function closeModal(modalId) { /* ... your original code ... */ }
function showSuccessMessage(message) { /* ... your original code ... */ }
function showAutocomplete(inputValue) { /* ... your original code ... */ }
function hideAutocomplete() { /* ... your original code ... */ }
function selectAutocompleteItem(index) { /* ... your original code ... */ }
function navigateAutocomplete(direction) { /* ... your original code ... */ }
window.onclick = function(event) { if (event.target.classList.contains('modal')) event.target.style.display = 'none'; }
