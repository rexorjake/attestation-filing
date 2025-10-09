// =================== CONFIGURATION ===================
// PASTE YOUR NEW API URL HERE
// This URL must be the 'exec' URL from your deployed Google Apps Script Web App.
const API_URL = 'https://script.google.com/macros/s/AKfycbzuze5mIwq_w8G1MxR93KsmYjutgx_JT5EbaXG179OFTghNRmvGidrD51PeU-98szAy_A/exec'; // <<< REMEMBER TO UPDATE THIS!

// =================== GLOBAL VARIABLES ===================
let allNames = [];
let selectedIndex = -1;
let currentRecordName = '';

// =================== API CALLING FUNCTION ===================
// This version expects a direct JSON response from Google Apps Script (using ContentService)
async function callApi(path, method = 'GET', data = null) {
  let url = `${API_URL}?path=${path}`;
  if (method === 'GET' && data) {
    // Append GET parameters to the URL
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) { // Only append if value exists
        url += `&${key}=${encodeURIComponent(data[key])}`;
      }
    }
  }

  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json' // Important for sending JSON
    }
  };

  if (method === 'POST' && data) {
    options.body = JSON.stringify(data); // Send data as JSON body for POST requests
  }

  try {
    const response = await fetch(url, options);
    
    // Check if the response itself is OK (e.g., HTTP status 200-299)
    if (!response.ok) {
      // Try to parse error message if available, otherwise use status
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorText || 'Unknown error'}`);
    }

    // Parse the response as JSON directly
    const jsonResponse = await response.json();
    return jsonResponse;

  } catch (error) {
    console.error('API Call Failed:', error);
    // Display a user-friendly error message on the page
    showResults({ error: `Connection failed: ${error.message}. Check browser console for details.` });
    throw error; // Re-throw to propagate the error for further handling
  }
}

// =================== MODIFIED FUNCTIONS ===================
function performSearch() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  if (!searchTerm) {
    showResults([{ error: "Please enter a name to search" }]);
    return;
  }
  hideAutocomplete();
  showLoading();
  callApi('search', 'GET', { term: searchTerm })
    .then(data => showResults(data))
    .catch(error => console.error('Search failed:', error));
}

function submitPullOutForm() {
  const formData = {
    name: document.getElementById('pullOutName').value,
    action: 'Pull Out',
    pulledOutBy: document.getElementById('pulledOutBy').value.trim(),
    date: document.getElementById('pullOutDate').value,
    remarks: document.getElementById('pullOutRemarks').value.trim(),
    personInCharge: document.getElementById('personInCharge').value.trim()
  };

  if (!formData.pulledOutBy || !formData.date || !formData.personInCharge) {
    alert('Please fill in all required fields: "Pulled Out By", "Date", and "Person In Charge".');
    return;
  }

  const submitButton = document.querySelector('#pullOutForm button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Submitting...';
  submitButton.disabled = true;

  callApi('logAction', 'POST', formData)
    .then(response => {
      if (response.error) {
        alert('Error: ' + response.error);
      } else {
        closeModal('pullOutModal');
        showSuccessMessage('File pulled out successfully!');
        performSearch(); // Refresh results after action
      }
    })
    .catch(error => console.error('Pull Out failed:', error))
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

function submitReturnForm() {
  const formData = {
    name: document.getElementById('returnName').value,
    action: 'Return',
    pulledOutBy: document.getElementById('returnedBy').value.trim(), // Renamed to returnedBy for clarity in form data
    date: document.getElementById('returnDate').value,
    remarks: document.getElementById('returnRemarks').value.trim()
  };

  if (!formData.pulledOutBy || !formData.date) {
    alert('Please fill in all required fields: "Returned By" and "Date".');
    return;
  }

  const submitButton = document.querySelector('#returnForm button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Submitting...';
  submitButton.disabled = true;

  callApi('logAction', 'POST', formData)
    .then(response => {
      if (response.error) {
        alert('Error: ' + response.error);
      } else {
        closeModal('returnModal');
        showSuccessMessage('File returned successfully!');
        performSearch(); // Refresh results after action
      }
    })
    .catch(error => console.error('Return failed:', error))
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

function submitNoteForm() {
  const name = document.getElementById('noteName').value;
  const noteText = document.getElementById('noteText').value.trim();

  if (!noteText) {
    alert('Please enter a note.');
    return;
  }

  const submitButton = document.querySelector('#noteForm button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Saving...';
  submitButton.disabled = true;

  callApi('updateNote', 'POST', { name: name, note: noteText })
    .then(response => {
      if (response.error) {
        alert('Error: ' + response.error);
      } else {
        closeModal('noteModal');
        showSuccessMessage('Note saved successfully!');
        performSearch(); // Refresh results after action
      }
    })
    .catch(error => console.error('Save Note failed:', error))
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

function deleteNote(name) {
  if (!confirm('Are you sure you want to delete this note?')) {
    return;
  }

  callApi('updateNote', 'POST', { name: name, note: '' }) // Send empty string to clear the note
    .then(response => {
      if (response.error) {
        alert('Error: ' + response.error);
      } else {
        showSuccessMessage('Note deleted successfully!');
        performSearch(); // Refresh results after action
      }
    })
    .catch(error => console.error('Delete Note failed:', error));
}


// =================== INITIALIZATION ===================
document.addEventListener('DOMContentLoaded', function() {
  // Initial load of suggestions
  callApi('getSuggestions', 'GET')
    .then(response => {
      if (response.error) {
        console.error('Error loading names:', response.error);
      } else {
        allNames = response.names || [];
      }
    })
    .catch(error => console.error('Failed to load suggestions:', error));

  // Event Listeners for search functionality
  document.getElementById('searchButton').addEventListener('click', performSearch);

  const searchInput = document.getElementById('searchInput');
  if (searchInput) { // Ensure searchInput exists before adding listeners
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
          selectAutocompleteItem(selectedIndex);
        } else {
          performSearch();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault(); // Prevent cursor movement
        navigateAutocomplete(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); // Prevent cursor movement
        navigateAutocomplete(-1);
      } else if (e.key === 'Escape') {
        hideAutocomplete();
      }
    });

    let debounceTimer;
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const value = this.value.trim();
        if (value.length > 0) {
          showAutocomplete(value);
        } else {
          hideAutocomplete();
        }
      }, 300); // Debounce for 300ms
    });
  } else {
    console.error("Element with ID 'searchInput' not found. Check your HTML.");
  }


  // Click outside autocomplete to hide it
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) {
      hideAutocomplete();
    }
  });

  // Form submission listeners
  const pullOutForm = document.getElementById('pullOutForm');
  if (pullOutForm) {
    pullOutForm.addEventListener('submit', e => {
      e.preventDefault();
      submitPullOutForm();
    });
  } else {
    console.error("Element with ID 'pullOutForm' not found. Check your HTML.");
  }

  const returnForm = document.getElementById('returnForm');
  if (returnForm) {
    returnForm.addEventListener('submit', e => {
      e.preventDefault();
      submitReturnForm();
    });
  } else {
    console.error("Element with ID 'returnForm' not found. Check your HTML.");
  }

  const noteForm = document.getElementById('noteForm');
  if (noteForm) {
    noteForm.addEventListener('submit', e => {
      e.preventDefault();
      submitNoteForm();
    });
  } else {
    console.error("Element with ID 'noteForm' not found. Check your HTML.");
  }


  // Set initial dates for modals
  const pullOutDateInput = document.getElementById('pullOutDate');
  if (pullOutDateInput) pullOutDateInput.valueAsDate = new Date();
  
  const returnDateInput = document.getElementById('returnDate');
  if (returnDateInput) returnDateInput.valueAsDate = new Date();
});

// =================== UI FUNCTIONS ===================

function showResults(response) {
  var container = document.getElementById('resultsContainer');
  if (!container) {
    console.error("Element with ID 'resultsContainer' not found.");
    return;
  }
  container.innerHTML = ''; // Clear previous results

  // Display error message if present
  if (response.error) {
    container.innerHTML = `<div class="error-message"><span class="material-icons">error</span> ${response.error}</div>`;
    document.getElementById('resultsCount').style.display = 'none';
    document.getElementById('sheetInfo').textContent = '';
    return;
  }

  // Display sheet name if provided
  const sheetInfoElement = document.getElementById('sheetInfo');
  if (sheetInfoElement) {
    sheetInfoElement.textContent = response.sheetName ? 'Sheet: ' + response.sheetName : '';
  }

  // Handle no records found
  if (!response.results || response.results.length === 0) {
    container.innerHTML = `<div class="no-results"><div class="no-results-icon"><span class="material-icons" style="font-size: 64px;">find_in_page</span></div><div class="no-results-text">No records found matching your search.</div></div>`;
    document.getElementById('resultsCount').style.display = 'none';
    return;
  }

  // Display results count
  const resultsCountElement = document.getElementById('resultsCount');
  if (resultsCountElement) {
    resultsCountElement.textContent = response.results.length;
    resultsCountElement.style.display = 'inline-block';
  }

  // Render each record
  response.results.forEach(function(record) {
    var recordDiv = document.createElement('div');
    recordDiv.className = 'record-card';
    if (record.Status === "Pulled Out") {
      recordDiv.classList.add('pulled-out');
    }

    var headerDiv = document.createElement('div');
    headerDiv.className = 'record-header';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'record-name';
    nameDiv.innerHTML = `<span class="material-icons">person</span> ${record.Name || 'Unnamed Record'}`;
    if (record.Position) {
      nameDiv.innerHTML += `<span class="position-badge">${record.Position}</span>`;
    }

    var statusDiv = document.createElement('div');
    if (record.Status === "Pulled Out") {
      statusDiv.className = 'status-badge status-pulled-out';
      statusDiv.innerHTML = '<span class="material-icons">folder_open</span> Pulled Out';
    } else {
      statusDiv.className = 'status-badge status-in-filing';
      statusDiv.innerHTML = '<span class="material-icons">folder</span> In Filing';
    }

    headerDiv.appendChild(nameDiv);
    headerDiv.appendChild(statusDiv);
    recordDiv.appendChild(headerDiv);

    var detailsDiv = document.createElement('div');
    detailsDiv.className = 'record-details';

    const orderedFields = ['Storage Area', 'Level', 'Partition'];
    orderedFields.forEach(function(fieldName) {
      if (record[fieldName]) {
        var itemDiv = document.createElement('div');
        itemDiv.className = 'detail-item';
        var labelDiv = document.createElement('div');
        labelDiv.className = 'detail-label';
        labelDiv.textContent = fieldName;
        var valueDiv = document.createElement('div');
        valueDiv.className = 'detail-value';
        if (fieldName === 'Storage Area') {
          valueDiv.innerHTML = `<span class="storage-badge"><span class="material-icons" style="font-size: 16px; vertical-align: middle;">inventory_2</span> ${record[fieldName]}</span>`;
        } else {
          valueDiv.textContent = record[fieldName];
        }
        itemDiv.appendChild(labelDiv);
        itemDiv.appendChild(valueDiv);
        detailsDiv.appendChild(itemDiv);
      }
    });

    // Add any other fields that are not already handled or explicitly excluded
    Object.keys(record).forEach(function(key) {
      if (key !== 'Name' && key !== 'Position' && key !== 'Status' && key !== 'Notes' && !orderedFields.includes(key) && record[key]) {
        var itemDiv = document.createElement('div');
        itemDiv.className = 'detail-item';
        var labelDiv = document.createElement('div');
        labelDiv.className = 'detail-label';
        labelDiv.textContent = key;
        var valueDiv = document.createElement('div');
        valueDiv.className = 'detail-value';
        valueDiv.textContent = record[key];
        itemDiv.appendChild(labelDiv);
        itemDiv.appendChild(valueDiv);
        detailsDiv.appendChild(itemDiv);
      }
    });

    recordDiv.appendChild(detailsDiv);

    var noteSection = document.createElement('div');
    noteSection.className = 'note-section';

    if (record.Notes) {
      var noteDisplay = document.createElement('div');
      noteDisplay.className = 'note-display';
      noteDisplay.innerHTML = `<div class="note-label"><span class="material-icons">note</span> Note:</div><div class="note-text">${record.Notes}</div>`;
      noteSection.appendChild(noteDisplay);
    }

    var noteActions = document.createElement('div');
    noteActions.className = 'note-actions';

    if (record.Notes) {
      var editNoteButton = document.createElement('button');
      editNoteButton.className = 'note-button edit-note-button';
      editNoteButton.dataset.name = record.Name;
      editNoteButton.innerHTML = '<span class="material-icons">edit</span> Edit Note';

      var deleteNoteButton = document.createElement('button');
      deleteNoteButton.className = 'note-button delete-note-button';
      deleteNoteButton.dataset.name = record.Name;
      deleteNoteButton.innerHTML = '<span class="material-icons">delete</span> Delete Note';

      noteActions.appendChild(editNoteButton);
      noteActions.appendChild(deleteNoteButton);
    } else {
      var addNoteButton = document.createElement('button');
      addNoteButton.className = 'note-button add-note-button';
      addNoteButton.dataset.name = record.Name;
      addNoteButton.innerHTML = '<span class="material-icons">note_add</span> Add Note';
      noteActions.appendChild(addNoteButton);
    }

    noteSection.appendChild(noteActions);
    recordDiv.appendChild(noteSection);

    var actionsDiv = document.createElement('div');
    actionsDiv.className = 'record-actions';

    var pullOutButton = document.createElement('button');
    pullOutButton.className = 'action-button pull-out-button';
    pullOutButton.dataset.name = record.Name;
    pullOutButton.innerHTML = '<span class="material-icons">file_download</span> Pull Out';
    if (record.Status === "Pulled Out") {
      pullOutButton.disabled = true;
      pullOutButton.title = "File is already pulled out";
    }

    var returnButton = document.createElement('button');
    returnButton.className = 'action-button return-button';
    returnButton.dataset.name = record.Name;
    returnButton.innerHTML = '<span class="material-icons">file_upload</span> Return';
    if (record.Status !== "Pulled Out") {
      returnButton.disabled = true;
      returnButton.title = "File is already in filing";
    }

    actionsDiv.appendChild(pullOutButton);
    actionsDiv.appendChild(returnButton);
    recordDiv.appendChild(actionsDiv);
    container.appendChild(recordDiv);
  });

  // Attach event listeners to newly created buttons
  document.querySelectorAll('.pull-out-button:not([disabled])').forEach(button => {
    button.addEventListener('click', function() {
      openPullOutModal(this.dataset.name);
    });
  });

  document.querySelectorAll('.return-button:not([disabled])').forEach(button => {
    button.addEventListener('click', function() {
      openReturnModal(this.dataset.name);
    });
  });

  document.querySelectorAll('.add-note-button').forEach(button => {
    button.addEventListener('click', function() {
      openNoteModal(this.dataset.name, 'Add', '');
    });
  });

  document.querySelectorAll('.edit-note-button').forEach(button => {
    const noteTextElement = button.closest('.record-card').querySelector('.note-text');
    const noteText = noteTextElement ? noteTextElement.textContent : '';
    button.addEventListener('click', function() {
      openNoteModal(this.dataset.name, 'Edit', noteText);
    });
  });

  document.querySelectorAll('.delete-note-button').forEach(button => {
    button.addEventListener('click', function() {
      deleteNote(this.dataset.name);
    });
  });
}

function showLoading() {
  var container = document.getElementById('resultsContainer');
  if (container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  }
  const resultsCountElement = document.getElementById('resultsCount');
  if (resultsCountElement) resultsCountElement.style.display = 'none';
  const sheetInfoElement = document.getElementById('sheetInfo');
  if (sheetInfoElement) sheetInfoElement.textContent = '';
}

function openPullOutModal(name) {
  currentRecordName = name;
  const pullOutNameInput = document.getElementById('pullOutName');
  if (pullOutNameInput) pullOutNameInput.value = name;
  const pullOutModal = document.getElementById('pullOutModal');
  if (pullOutModal) pullOutModal.style.display = 'block';
  const pulledOutByInput = document.getElementById('pulledOutBy');
  if (pulledOutByInput) pulledOutByInput.focus();
}

function openReturnModal(name) {
  currentRecordName = name;
  const returnNameInput = document.getElementById('returnName');
  if (returnNameInput) returnNameInput.value = name;
  const returnModal = document.getElementById('returnModal');
  if (returnModal) returnModal.style.display = 'block';
  const returnedByInput = document.getElementById('returnedBy');
  if (returnedByInput) returnedByInput.focus();
}

function openNoteModal(name, action, noteText = '') {
  currentRecordName = name;
  const noteNameInput = document.getElementById('noteName');
  if (noteNameInput) noteNameInput.value = name;
  const noteTextInput = document.getElementById('noteText');
  if (noteTextInput) noteTextInput.value = noteText;
  const noteModalTitle = document.getElementById('noteModalTitle');
  if (noteModalTitle) noteModalTitle.textContent = action + ' Note';
  const noteModal = document.getElementById('noteModal');
  if (noteModal) noteModal.style.display = 'block';
  if (noteTextInput) noteTextInput.focus();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';

  // Reset form fields
  if (modalId === 'pullOutModal') {
    const form = document.getElementById('pullOutForm');
    if (form) form.reset();
    const pullOutDateInput = document.getElementById('pullOutDate');
    if (pullOutDateInput) pullOutDateInput.valueAsDate = new Date(); // Reset date
  } else if (modalId === 'returnModal') {
    const form = document.getElementById('returnForm');
    if (form) form.reset();
    const returnDateInput = document.getElementById('returnDate');
    if (returnDateInput) returnDateInput.valueAsDate = new Date(); // Reset date
  } else if (modalId === 'noteModal') {
    const form = document.getElementById('noteForm');
    if (form) form.reset();
  }
}

function showSuccessMessage(message) {
  const container = document.getElementById('resultsContainer');
  if (!container) return;

  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.innerHTML = `<span class="material-icons">check_circle</span> ${message}`;
  
  // Insert at the top of the results container
  container.insertBefore(successDiv, container.firstChild);

  // Animate fade out and remove
  setTimeout(() => {
    successDiv.style.opacity = '0';
    successDiv.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      if (container.contains(successDiv)) {
        container.removeChild(successDiv);
      }
    }, 500); // Wait for transition to finish
  }, 5000); // Display for 5 seconds
}


function showAutocomplete(inputValue) {
  const dropdown = document.getElementById('autocompleteDropdown');
  if (!dropdown) return;

  dropdown.innerHTML = '';
  selectedIndex = -1;

  if (inputValue.length === 0) {
    dropdown.style.display = 'none';
    return;
  }

  const filteredNames = allNames.filter(name => name.toLowerCase().includes(inputValue.toLowerCase()));

  if (filteredNames.length === 0) {
    dropdown.innerHTML = '<div class="autocomplete-no-results">No matching names found</div>';
  } else {
    const limitedNames = filteredNames.slice(0, 10); // Limit to 10 suggestions
    limitedNames.forEach((name, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.dataset.index = index;
      item.dataset.name = name; // Store full name
      
      const icon = document.createElement('span');
      icon.className = 'material-icons autocomplete-item-icon';
      icon.textContent = 'person'; // Or 'folder' etc.

      const text = document.createElement('span');
      text.className = 'autocomplete-text';
      // Highlight matching part
      const regex = new RegExp(`(${inputValue})`, 'gi');
      const highlightedName = name.replace(regex, '<span class="autocomplete-highlight">$1</span>');
      text.innerHTML = highlightedName;

      item.appendChild(icon);
      item.appendChild(text);

      item.addEventListener('click', function() {
        selectAutocompleteItem(index);
      });
      dropdown.appendChild(item);
    });
  }
  dropdown.style.display = 'block';
}

function hideAutocomplete() {
  const dropdown = document.getElementById('autocompleteDropdown');
  if (dropdown) dropdown.style.display = 'none';
  selectedIndex = -1;
}

function selectAutocompleteItem(index) {
  const items = document.querySelectorAll('.autocomplete-item');
  if (items && items[index]) {
    const name = items[index].dataset.name;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = name;
    hideAutocomplete();
    performSearch(); // Automatically search after selecting
  }
}

function navigateAutocomplete(direction) {
  const items = document.querySelectorAll('.autocomplete-item');
  if (items.length === 0) return;

  if (selectedIndex >= 0 && items[selectedIndex]) {
    items[selectedIndex].classList.remove('selected');
  }

  selectedIndex += direction;

  if (selectedIndex < 0) {
    selectedIndex = items.length - 1; // Wrap around to the last item
  } else if (selectedIndex >= items.length) {
    selectedIndex = 0; // Wrap around to the first item
  }

  if (items[selectedIndex]) {
    items[selectedIndex].classList.add('selected');
    // Scroll the selected item into view if it's not already
    items[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// Global click handler to close modals when clicking outside them
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
    // Also reset forms when clicking outside to close
    if (event.target.id === 'pullOutModal') closeModal('pullOutModal');
    else if (event.target.id === 'returnModal') closeModal('returnModal');
    else if (event.target.id === 'noteModal') closeModal('noteModal');
  }
}
