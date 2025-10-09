// =================== CONFIGURATION ===================
// PASTE YOUR APPS SCRIPT WEB APP URL HERE
const API_URL = 'https://script.google.com/macros/s/AKfycbxscGidMS41AAj5BGd_N0KwhYPk7Ty_dozjmU5oUCZ6PpKFMp_P6kjf6elr0xXpBfkkHA/exec';

// =================== GLOBAL VARIABLES ===================
let allNames = [];
let selectedIndex = -1;
let currentRecordName = '';

// =================== API CALLING FUNCTION ===================
async function callApi(path, method = 'GET', data = null) {
  let url = `${API_URL}?path=${path}`;
  
  if (method === 'GET' && data) {
    for (const key in data) {
      url += `&${key}=${encodeURIComponent(data[key])}`;
    }
  }
  
  const options = {
    method: method,
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('API Call Failed:', error);
    showResults({ error: `Connection failed: ${error.message}` });
    throw error;
  }
}

// =================== SEARCH FUNCTIONS ===================
function performSearch() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  if (!searchTerm) {
    showResults({ error: "Please enter a name to search" });
    return;
  }
  
  hideAutocomplete();
  showLoading();
  
  callApi('search', 'GET', { term: searchTerm })
    .then(data => showResults(data))
    .catch(error => console.error('Search failed:', error));
}

// =================== FORM SUBMIT FUNCTIONS ===================
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
      if (response.error) {
        alert('Error: ' + response.error);
      } else {
        closeModal('pullOutModal');
        showSuccessMessage('File pulled out successfully!');
        performSearch();
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
    returnedBy: document.getElementById('returnedBy').value,
    date: document.getElementById('returnDate').value,
    remarks: document.getElementById('returnRemarks').value
  };
  
  if (!formData.returnedBy || !formData.date) {
    alert('Please fill in all required fields');
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
        performSearch();
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
      if (response.error) {
        alert('Error: ' + response.error);
      } else {
        closeModal('noteModal');
        showSuccessMessage('Note saved successfully!');
        performSearch();
      }
    })
    .catch(error => console.error('Save Note failed:', error))
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

function deleteNote(name) {
  callApi('updateNote', 'POST', { name: name, note: '' })
    .then(response => {
      if (response.error) {
        alert('Error: ' + response.error);
      } else {
        showSuccessMessage('Note deleted successfully!');
        performSearch();
      }
    })
    .catch(error => console.error('Delete Note failed:', error));
}

// =================== INITIALIZATION ===================
document.addEventListener('DOMContentLoaded', function() {
  // Load suggestions
  callApi('getSuggestions', 'GET')
    .then(response => {
      if (response.error) {
        console.error('Error loading names:', response.error);
      } else {
        allNames = response.names || [];
      }
    })
    .catch(error => console.error('Failed to load suggestions:', error));
  
  // Check if elements exist before adding event listeners
  const searchButton = document.getElementById('searchButton');
  if (searchButton) {
    searchButton.addEventListener('click', performSearch);
  }
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
          selectAutocompleteItem(selectedIndex);
        } else {
          performSearch();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateAutocomplete(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateAutocomplete(-1);
      } else if (e.key === 'Escape') {
        hideAutocomplete();
      }
    });
    
    // Debounced autocomplete
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
      }, 300);
    });
  }
  
  // Close autocomplete on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) {
      hideAutocomplete();
    }
  });
  
  // Form submissions
  const pullOutForm = document.getElementById('pullOutForm');
  if (pullOutForm) {
    pullOutForm.addEventListener('submit', e => {
      e.preventDefault();
      submitPullOutForm();
    });
  }
  
  const returnForm = document.getElementById('returnForm');
  if (returnForm) {
    returnForm.addEventListener('submit', e => {
      e.preventDefault();
      submitReturnForm();
    });
  }
  
  const noteForm = document.getElementById('noteForm');
  if (noteForm) {
    noteForm.addEventListener('submit', e => {
      e.preventDefault();
      submitNoteForm();
    });
  }
  
  // Set default dates
  const pullOutDate = document.getElementById('pullOutDate');
  if (pullOutDate) {
    pullOutDate.valueAsDate = new Date();
  }
  
  const returnDate = document.getElementById('returnDate');
  if (returnDate) {
    returnDate.valueAsDate = new Date();
  }
});

// =================== UI FUNCTIONS ===================
function showResults(response) {
  const container = document.getElementById('resultsContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  const resultsCount = document.getElementById('resultsCount');
  const sheetInfo = document.getElementById('sheetInfo');
  
  if (response.error) {
    container.innerHTML = '<div class="error-message"><span class="material-icons">error</span> ' + response.error + '</div>';
    if (resultsCount) resultsCount.style.display = 'none';
    if (sheetInfo) sheetInfo.textContent = '';
    return;
  }
  
  if (response.sheetName && sheetInfo) {
    sheetInfo.textContent = 'Sheet: ' + response.sheetName;
  }
  
  if (!response.results || response.results.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">
          <span class="material-icons" style="font-size: 64px;">find_in_page</span>
        </div>
        <div class="no-results-text">No records found matching your search.</div>
      </div>
    `;
    if (resultsCount) resultsCount.style.display = 'none';
    return;
  }
  
  if (resultsCount) {
    resultsCount.textContent = response.results.length;
    resultsCount.style.display = 'inline-block';
  }
  
  response.results.forEach(function(record) {
    const recordDiv = createRecordCard(record);
    container.appendChild(recordDiv);
  });
  
  // Add event listeners to action buttons
  attachButtonListeners();
}

function createRecordCard(record) {
  const recordDiv = document.createElement('div');
  recordDiv.className = 'record-card';
  if (record.Status === "Pulled Out") {
    recordDiv.classList.add('pulled-out');
  }
  
  // Create header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'record-header';
  
  const nameDiv = document.createElement('div');
  nameDiv.className = 'record-name';
  nameDiv.innerHTML = `<span class="material-icons">person</span> ${record.Name || 'Unnamed Record'}`;
  if (record.Position) {
    nameDiv.innerHTML += `<span class="position-badge">${record.Position}</span>`;
  }
  
  const statusDiv = document.createElement('div');
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
  
  // Create details section
  const detailsDiv = document.createElement('div');
  detailsDiv.className = 'record-details';
  
  const orderedFields = ['Storage Area', 'Level', 'Partition'];
  orderedFields.forEach(function(fieldName) {
    if (record[fieldName]) {
      const itemDiv = createDetailItem(fieldName, record[fieldName]);
      detailsDiv.appendChild(itemDiv);
    }
  });
  
  // Add other fields
  Object.keys(record).forEach(function(key) {
    if (key !== 'Name' && key !== 'Position' && key !== 'Status' && key !== 'Notes' && 
        !orderedFields.includes(key) && record[key]) {
      const itemDiv = createDetailItem(key, record[key]);
      detailsDiv.appendChild(itemDiv);
    }
  });
  
  recordDiv.appendChild(detailsDiv);
  
  // Create note section
  const noteSection = createNoteSection(record);
  recordDiv.appendChild(noteSection);
  
  // Create actions section
  const actionsDiv = createActionsSection(record);
  recordDiv.appendChild(actionsDiv);
  
  return recordDiv;
}

function createDetailItem(label, value) {
  const itemDiv = document.createElement('div');
  itemDiv.className = 'detail-item';
  
  const labelDiv = document.createElement('div');
  labelDiv.className = 'detail-label';
  labelDiv.textContent = label;
  
  const valueDiv = document.createElement('div');
  valueDiv.className = 'detail-value';
  
  if (label === 'Storage Area') {
    valueDiv.innerHTML = `
      <span class="storage-badge">
        <span class="material-icons" style="font-size: 16px; vertical-align: middle;">inventory_2</span> 
        ${value}
      </span>
    `;
  } else {
    valueDiv.textContent = value;
  }
  
  itemDiv.appendChild(labelDiv);
  itemDiv.appendChild(valueDiv);
  return itemDiv;
}

function createNoteSection(record) {
  const noteSection = document.createElement('div');
  noteSection.className = 'note-section';
  
  if (record.Notes) {
    const noteDisplay = document.createElement('div');
    noteDisplay.className = 'note-display';
    noteDisplay.innerHTML = `
      <div class="note-label"><span class="material-icons">note</span> Note:</div>
      <div class="note-text">${record.Notes}</div>
    `;
    noteSection.appendChild(noteDisplay);
  }
  
  const noteActions = document.createElement('div');
  noteActions.className = 'note-actions';
  
  if (record.Notes) {
    const editNoteButton = document.createElement('button');
    editNoteButton.className = 'note-button edit-note-button';
    editNoteButton.dataset.name = record.Name;
    editNoteButton.dataset.noteText = record.Notes;
    editNoteButton.innerHTML = '<span class="material-icons">edit</span> Edit Note';
    
    const deleteNoteButton = document.createElement('button');
    deleteNoteButton.className = 'note-button delete-note-button';
    deleteNoteButton.dataset.name = record.Name;
    deleteNoteButton.innerHTML = '<span class="material-icons">delete</span> Delete Note';
    
    noteActions.appendChild(editNoteButton);
    noteActions.appendChild(deleteNoteButton);
  } else {
    const addNoteButton = document.createElement('button');
    addNoteButton.className = 'note-button add-note-button';
    addNoteButton.dataset.name = record.Name;
    addNoteButton.innerHTML = '<span class="material-icons">note_add</span> Add Note';
    noteActions.appendChild(addNoteButton);
  }
  
  noteSection.appendChild(noteActions);
  return noteSection;
}

function createActionsSection(record) {
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'record-actions';
  
  const pullOutButton = document.createElement('button');
  pullOutButton.className = 'action-button pull-out-button';
  pullOutButton.dataset.name = record.Name;
  pullOutButton.innerHTML = '<span class="material-icons">file_download</span> Pull Out';
  
  if (record.Status === "Pulled Out") {
    pullOutButton.disabled = true;
    pullOutButton.title = "File is already pulled out";
  }
  
  const returnButton = document.createElement('button');
  returnButton.className = 'action-button return-button';
  returnButton.dataset.name = record.Name;
  returnButton.innerHTML = '<span class="material-icons">file_upload</span> Return';
  
  if (record.Status !== "Pulled Out") {
    returnButton.disabled = true;
    returnButton.title = "File is already in filing";
  }
  
  actionsDiv.appendChild(pullOutButton);
  actionsDiv.appendChild(returnButton);
  
  return actionsDiv;
}

function attachButtonListeners() {
  // Pull out buttons
  document.querySelectorAll('.pull-out-button:not([disabled])').forEach(button => {
    button.addEventListener('click', function() {
      openPullOutModal(this.dataset.name);
    });
  });
  
  // Return buttons
  document.querySelectorAll('.return-button:not([disabled])').forEach(button => {
    button.addEventListener('click', function() {
      openReturnModal(this.dataset.name);
    });
  });
  
  // Add note buttons
  document.querySelectorAll('.add-note-button').forEach(button => {
    button.addEventListener('click', function() {
      openNoteModal(this.dataset.name, 'Add', '');
    });
  });
  
  // Edit note buttons
  document.querySelectorAll('.edit-note-button').forEach(button => {
    button.addEventListener('click', function() {
      openNoteModal(this.dataset.name, 'Edit', this.dataset.noteText);
    });
  });
  
  // Delete note buttons
  document.querySelectorAll('.delete-note-button').forEach(button => {
    button.addEventListener('click', function() {
      if (confirm('Are you sure you want to delete this note?')) {
        deleteNote(this.dataset.name);
      }
    });
  });
}

function showLoading() {
  const container = document.getElementById('resultsContainer');
  if (!container) return;
  
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) resultsCount.style.display = 'none';
  
  const sheetInfo = document.getElementById('sheetInfo');
  if (sheetInfo) sheetInfo.textContent = '';
}

// Modal Functions
function openPullOutModal(name) {
  currentRecordName = name;
  const nameField = document.getElementById('pullOutName');
  if (nameField) nameField.value = name;
  
  const modal = document.getElementById('pullOutModal');
  if (modal) modal.style.display = 'block';
  
  const focusField = document.getElementById('pulledOutBy');
  if (focusField) focusField.focus();
}

function openReturnModal(name) {
  currentRecordName = name;
  const nameField = document.getElementById('returnName');
  if (nameField) nameField.value = name;
  
  const modal = document.getElementById('returnModal');
  if (modal) modal.style.display = 'block';
  
  const focusField = document.getElementById('returnedBy');
  if (focusField) focusField.focus();
}

function openNoteModal(name, action, noteText = '') {
  currentRecordName = name;
  
  const nameField = document.getElementById('noteName');
  if (nameField) nameField.value = name;
  
  const textField = document.getElementById('noteText');
  if (textField) textField.value = noteText;
  
  const title = document.getElementById('noteModalTitle');
  if (title) title.textContent = action + ' Note';
  
  const modal = document.getElementById('noteModal');
  if (modal) modal.style.display = 'block';
  
  if (textField) textField.focus();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  modal.style.display = 'none';
  
  if (modalId === 'pullOutModal') {
    const form = document.getElementById('pullOutForm');
    if (form) form.reset();
    const dateField = document.getElementById('pullOutDate');
    if (dateField) dateField.valueAsDate = new Date();
  } else if (modalId === 'returnModal') {
    const form = document.getElementById('returnForm');
    if (form) form.reset();
    const dateField = document.getElementById('returnDate');
    if (dateField) dateField.valueAsDate = new Date();
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
  
  container.insertBefore(successDiv, container.firstChild);
  
  setTimeout(() => {
    successDiv.style.opacity = '0';
    successDiv.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      if (container.contains(successDiv)) {
        container.removeChild(successDiv);
      }
    }, 500);
  }, 5000);
}

// Autocomplete Functions
function showAutocomplete(inputValue) {
  const dropdown = document.getElementById('autocompleteDropdown');
  if (!dropdown) return;
  
  dropdown.innerHTML = '';
  selectedIndex = -1;
  
  if (inputValue.length === 0) {
    dropdown.style.display = 'none';
    return;
  }
  
  const filteredNames = allNames.filter(name => 
    name.toLowerCase().includes(inputValue.toLowerCase())
  );
  
  if (filteredNames.length === 0) {
    dropdown.innerHTML = '<div class="autocomplete-no-results">No matching names found</div>';
  } else {
    const limitedNames = filteredNames.slice(0, 10);
    limitedNames.forEach((name, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.dataset.index = index;
      item.dataset.name = name;
      
      const icon = document.createElement('span');
      icon.className = 'material-icons autocomplete-item-icon';
      icon.textContent = 'person';
      
      const text = document.createElement('span');
      text.className = 'autocomplete-text';
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
  if (dropdown) {
    dropdown.style.display = 'none';
  }
  selectedIndex = -1;
}

function selectAutocompleteItem(index) {
  const items = document.querySelectorAll('.autocomplete-item');
  if (items && items[index]) {
    const name = items[index].dataset.name;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = name;
    }
    hideAutocomplete();
    performSearch();
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
    selectedIndex = items.length - 1;
  } else if (selectedIndex >= items.length) {
    selectedIndex = 0;
  }
  
  items[selectedIndex].classList.add('selected');
  items[selectedIndex].scrollIntoView({ block: 'nearest' });
}

// Close modals on outside click
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
}
