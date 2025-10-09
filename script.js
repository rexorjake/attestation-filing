// =================== CONFIGURATION ===================
// PASTE YOUR API URL FROM THE APPS SCRIPT DEPLOYMENT STEP HERE
const API_URL = 'https://script.google.com/macros/s/AKfycbw31eMBxX1l_Tny197t5YVGWMQiOji54jFTyrVxvTSUgkLDJq7uyC_DrrmwTK-4ul4m/exec';

// =================== GLOBAL VARIABLES ===================
let allNames = [];
let selectedIndex = -1;
let currentRecordName = '';

// =================== API CALLING FUNCTION ===================
// This function is modified to handle the HTML-wrapped JSON response from Apps Script.
async function callApi(path, method = 'GET', data = null) {
  const url = new URL(API_URL);
  url.searchParams.append('path', path);

  const options = {
    method: method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (method === 'GET' && data) {
    Object.keys(data).forEach(key => url.searchParams.append(key, data[key]));
  } else if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
  }

  console.log(`Calling API: ${method} ${url}`); // Debugging log

  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    // The response is now HTML, so we get it as text
    const responseText = await response.text();
    
    // We extract the JSON from inside the <script> tag
    const jsonString = responseText.match(/<script>(.*?)<\/script>/)[1];
    
    const responseData = JSON.parse(jsonString);
    console.log('API Response:', responseData); // Debugging log
    return responseData;
  } catch (error) {
    console.error('API Call Failed:', error);
    // Show a more user-friendly error on the page
    showResults([{ error: `Connection failed: ${error.message}. Check console.` }]);
    throw error; // Re-throw to stop further processing
  }
}

// =================== MODIFIED FUNCTIONS USING THE API ===================

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
    .catch(error => console.error('Search failed:', error)); // Error is already shown in callApi
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
      if (response.error) alert('Error: ' + response.error);
      else {
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
      if (response.error) alert('Error: ' + response.error);
      else {
        showSuccessMessage('Note deleted successfully!');
        performSearch();
      }
    })
    .catch(error => console.error('Delete Note failed:', error));
}


// =================== INITIALIZATION AND EVENT LISTENERS ===================
document.addEventListener('DOMContentLoaded', function() {
  // Load names for autocomplete
  callApi('getSuggestions', 'GET')
    .then(response => {
      if (response.error) {
        console.error('Error loading names:', response.error);
      } else {
        allNames = response.names || [];
      }
    })
    .catch(error => console.error('Failed to load suggestions:', error));

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


// =================== UI FUNCTIONS (NO CHANGES NEEDED) ===================

function showResults(response) {
  var container = document.getElementById('resultsContainer');
  container.innerHTML = '';
  
  if (response.error) {
    container.innerHTML = '<div class="error-message"><span class="material-icons">error</span> ' + response.error + '</div>';
    document.getElementById('resultsCount').style.display = 'none';
    document.getElementById('sheetInfo').textContent = '';
    return;
  }
  
  if (response.sheetName) {
    document.getElementById('sheetInfo').textContent = 'Sheet: ' + response.sheetName;
  }
  
  if (response.results.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">
          <span class="material-icons" style="font-size: 64px;">find_in_page</span>
        </div>
        <div class="no-results-text">No records found matching your search.</div>
      </div>
    `;
    document.getElementById('resultsCount').style.display = 'none';
    return;
  }
  
  document.getElementById('resultsCount').textContent = response.results.length;
  document.getElementById('resultsCount').style.display = 'inline-block';
  
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
    
    headerDiv.appendChild(nameDiv);
    
    var statusDiv = document.createElement('div');
    if (record.Status === "Pulled Out") {
      statusDiv.className = 'status-badge status-pulled-out';
      statusDiv.innerHTML = '<span class="material-icons">folder_open</span> Pulled Out';
    } else {
      statusDiv.className = 'status-badge status-in-filing';
      statusDiv.innerHTML = '<span class="material-icons">folder</span> In Filing';
    }
    
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
    
    Object.keys(record).forEach(function(key) {
      if (key !== 'Name' && key !== 'Position' && key !== 'Status' && key !== 'Notes' && 
          !orderedFields.includes(key) && record[key]) {
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
      noteDisplay.innerHTML = `
        <div class="note-label">
          <span class="material-icons">note</span>
          Note:
        </div>
        <div class="note-text">${record.Notes}</div>
      `;
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
    button.addEventListener('click', function() {
      const noteText = this.closest('.record-card').querySelector('.note-text').textContent;
      openNoteModal(this.dataset.name, 'Edit', noteText);
    });
  });
  
  document.querySelectorAll('.delete-note-button').forEach(button => {
    button.addEventListener('click', function() {
      if (confirm('Are you sure you want to delete this note?')) {
        deleteNote(this.dataset.name);
      }
    });
  });
}

function showLoading() {
  var container = document.getElementById('resultsContainer');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  document.getElementById('resultsCount').style.display = 'none';
  document.getElementById('sheetInfo').textContent = '';
}

function openPullOutModal(name) {
  currentRecordName = name;
  document.getElementById('pullOutName').value = name;
  document.getElementById('pullOutModal').style.display = 'block';
  document.getElementById('pulledOutBy').focus();
}

function openReturnModal(name) {
  currentRecordName = name;
  document.getElementById('returnName').value = name;
  document.getElementById('returnModal').style.display = 'block';
  document.getElementById('returnedBy').focus();
}

function openNoteModal(name, action, noteText = '') {
  currentRecordName = name;
  document.getElementById('noteName').value = name;
  document.getElementById('noteText').value = noteText;
  document.getElementById('noteModalTitle').textContent = action + ' Note';
  document.getElementById('noteModal').style.display = 'block';
  document.getElementById('noteText').focus();
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
  if (modalId === 'pullOutModal') {
    document.getElementById('pullOutForm').reset();
    document.getElementById('pullOutDate').valueAsDate = new Date();
  } else if (modalId === 'returnModal') {
    document.getElementById('returnForm').reset();
    document.getElementById('returnDate').valueAsDate = new Date();
  } else if (modalId === 'noteModal') {
    document.getElementById('noteForm').reset();
  }
}

function showSuccessMessage(message) {
  const container = document.getElementById('resultsContainer');
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

function showAutocomplete(inputValue) {
  const dropdown = document.getElementById('autocompleteDropdown');
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
  document.getElementById('autocompleteDropdown').style.display = 'none';
  selectedIndex = -1;
}

function selectAutocompleteItem(index) {
  const items = document.querySelectorAll('.autocomplete-item');
  if (items && items[index]) {
    const name = items[index].dataset.name;
    document.getElementById('searchInput').value = name;
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

window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
}
