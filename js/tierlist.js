const TIERS = [
  { name: "S", color: "rgb(220, 53, 69)" },   // Darker red
  { name: "A", color: "rgb(253, 126, 20)" },  // Darker orange
  { name: "B", color: "rgb(255, 193, 7)" },   // Amber
  { name: "C", color: "rgb(25, 135, 84)" },   // Green
  { name: "D", color: "rgb(13, 110, 253)" },  // Blue
  { name: "F", color: "rgb(111, 66, 193)" },  // Purple
];

let tierList = {};
let flavors = [];
let isEditing = false;
let draggableInstance = null;

// Add state variable for showing old flavors
let showOldFlavors = false;

// Fetch flavor data and initialize the tier list
async function fetchFlavors() {
  try {
    const response = await fetch("json/gfuel_flavors.json");
    flavors = await response.json();
    console.log("Flavors loaded:", flavors);
  } catch (error) {
    console.log("Failed to load flavors, using dummy data");
    flavors = [
      { name: "Blue Ice", image: "https://via.placeholder.com/100?text=Blue+Ice" },
      { name: "Tropical Rain", image: "https://via.placeholder.com/100?text=Tropical+Rain" },
      { name: "Sour Cherry", image: "https://via.placeholder.com/100?text=Sour+Cherry" },
      { name: "Strawberry Banana", image: "https://via.placeholder.com/100?text=Strawberry" },
      { name: "Watermelon", image: "https://via.placeholder.com/100?text=Watermelon" },
      { name: "Rainbow Sherbet", image: "https://via.placeholder.com/100?text=Rainbow" }
    ];
  }
  tierList = TIERS.reduce((acc, tier) => {
    acc[tier.name] = [];
    return acc;
  }, {});

  // Update toggle text after loading flavors
  updateOldFlavorsToggleText();

  // First check for backup, if not found then check URL code
  if (!checkForBackup()) {
    checkURLforCode();
  }

  renderTierList();
}

// Check if URL contains a code parameter and load the tier list
function checkURLforCode() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("c");
  const shortCode = url.searchParams.get("s");

  if (code) {
    // Fix base64 padding and replace URL-safe characters
    let fixedCode = code;
    // Add padding if needed
    while (fixedCode.length % 4 !== 0) {
      fixedCode += '=';
    }
    // Replace URL-safe characters with standard base64 characters
    fixedCode = fixedCode.replace(/-/g, '+').replace(/_/g, '/');

    loadTierListFromCode(fixedCode);
    console.log("Loaded tier list from URL code");

    // Clean URL
    url.searchParams.delete("c");
    window.history.pushState({}, document.title, url.toString());
    return true;
  }
  else if (shortCode) {
    // Handle compressed code
    const fullCode = decompressCode(shortCode);
    if (fullCode) {
      loadTierListFromCode(fullCode);
      console.log("Loaded tier list from compressed code");

      // Clean URL
      url.searchParams.delete("s");
      window.history.pushState({}, document.title, url.toString());
      return true;
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Short Code',
        text: 'The provided short code could not be decompressed.'
      });
    }
    return true;
  }

  return false;
}

// Load a previously saved tier list from a code
async function loadFromCode() {
  const inputCode = document.getElementById("inputCode").value;
  if (!inputCode) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: 'Please enter a valid code' });
    return;
  }

  // Handle both short codes and full codes
  if (inputCode.startsWith("TT-")) {
    const fullCode = decompressCode(inputCode);
    if (fullCode) {
      loadTierListFromCode(fullCode);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Code',
        text: 'The provided short code could not be decompressed.'
      });
    }
  } else {
    loadTierListFromCode(inputCode);
  }
}

// Load tier list from a given code
function loadTierListFromCode(inputCode) {
  tierList = TIERS.reduce((acc, tier) => {
    acc[tier.name] = [];
    return acc;
  }, {});

  try {
    const flavorCodeToName = {};
    flavors.forEach(flavor => {
      flavorCodeToName[flavor.code] = flavor.name;
    });

    const compactCode = atob(inputCode);
    console.log("Decoded code:", compactCode);

    const processedFlavors = new Set();
    let currentTier = null;
    let currentCode = "";
    let parsingCode = false;

    for (let i = 0; i < compactCode.length; i++) {
      const char = compactCode[i];

      if (TIERS.some(t => t.name === char) && !parsingCode) {
        currentTier = char;
        parsingCode = true;
        currentCode = "";
        continue;
      }

      if (char === "," && parsingCode) {
        if (currentCode && currentTier) {
          const flavorName = flavorCodeToName[currentCode];
          if (flavorName && !processedFlavors.has(flavorName)) {
            if (TIERS.some(t => t.name === currentTier)) {
              tierList[currentTier].push(flavorName);
              processedFlavors.add(flavorName);
            }
          }
        }
        currentCode = "";
        continue;
      }

      if (TIERS.some(t => t.name === char) && parsingCode) {
        if (currentCode && currentTier) {
          const flavorName = flavorCodeToName[currentCode];
          if (flavorName && !processedFlavors.has(flavorName)) {
            if (TIERS.some(t => t.name === currentTier)) {
              tierList[currentTier].push(flavorName);
              processedFlavors.add(flavorName);
            }
          }
        }
        currentTier = char;
        currentCode = "";
        continue;
      }

      if (parsingCode) {
        currentCode += char;
      }
    }

    if (currentCode && currentTier) {
      const flavorName = flavorCodeToName[currentCode];
      if (flavorName && !processedFlavors.has(flavorName)) {
        if (TIERS.some(t => t.name === currentTier)) {
          tierList[currentTier].push(flavorName);
          processedFlavors.add(flavorName);
        }
      }
    }

    console.log("Loaded tier list:", JSON.parse(JSON.stringify(tierList)));

    isEditing = true;
    renderTierList();
    Swal.fire('Tier list loaded!');
  } catch (error) {
    console.error("Error loading code:", error);
    Swal.fire({
      icon: 'error',
      title: 'Invalid Code',
      text: 'The provided code could not be parsed correctly.'
    });
  }
}

// Start a new empty tier list for editing
function startEditing() {
  isEditing = true;
  tierList = TIERS.reduce((acc, tier) => {
    acc[tier.name] = [];
    return acc;
  }, {});
  renderTierList();
}

// Generate a shareable code for the current tier arrangement
function generateCode() {
  // Create the mapping here, when flavors are actually loaded
  const flavorNameToCode = {};
  flavors.forEach(flavor => {
    flavorNameToCode[flavor.name] = flavor.code;
  });

  const encodedFlavors = new Set();
  let compactCode = '';

  for (const tier of TIERS) {
    const tierItems = tierList[tier.name] || [];
    if (tierItems.length > 0) {
      let tierCode = tier.name;

      tierItems.forEach(item => {
        const code = flavorNameToCode[item];
        if (code && !encodedFlavors.has(item)) {
          tierCode += code + ",";
          encodedFlavors.add(item);
        } else {
          console.warn(`Missing code for flavor: ${item}`);
        }
      });

      compactCode += tierCode;
    }
  }

  let encodedCode = compactCode ? btoa(compactCode) : "new";

  // Create compressed version for Discord-friendly sharing
  const shortCode = compressCode(encodedCode);

  // Check if the code is still too long for Discord
  const isTooLong = shortCode && shortCode.length > 1000; // Safety margin

  const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
  const shareableUrl = `${baseUrl}?c=${encodedCode}`;
  const shortUrl = `${baseUrl}?s=${shortCode}`;

  // Copy the appropriate code to clipboard
  if (isTooLong) {
    // If code is too long, just copy the URL instead
    navigator.clipboard.writeText(shortUrl);
  } else {
    // Normal case - copy the update command with short code
    navigator.clipboard.writeText(`/update code:${shortCode}`);
  }

  Swal.fire({
    icon: encodedCode === "new" ? 'error' : 'success',
    title: encodedCode === "new" ? 'Just a Minute!' : 'Important!',
    html: `<div class="text-center">
            <p>${encodedCode === "new" ? "Your tier list cannot be exported." : "You still have one more step to save."}</p>
            ${
              encodedCode === "new"
                ? `<p class="text-2xl font-bold mt-2 mb-4">No Tierlist!</p>
                   <p class="text-red-500">Empty tierlists cannot be saved</p>`
                : isTooLong
                  ? `<p>Your tierlist is very detailed! The code is too long for Discord.</p>
                     <p class="text-2xl font-bold mt-2 mb-4 break-all">Use this URL instead</p>
                     <p class="text-sm break-all">${shortUrl}</p>
                     <p class="text-sm">This URL has been copied to your clipboard.</p>
                     <p class="text-sm mt-2">You can share this link directly.</p>`
                  : `<p>The tier list still needs to be added to the global rankings by running:</p>
                     <p class="text-2xl font-bold mt-2 mb-4 break-all">/update code:${shortCode}</p>
                     <p class="text-sm">This command has been copied to your clipboard.</p>
                     <p class="text-sm mt-2">Using short code (${shortCode.length} chars) instead of full code (${encodedCode.length} chars)</p>`
            }
          </div>`,
    confirmButtonText: 'OK',
    confirmButtonColor: '#10B981',
    showCancelButton: !isTooLong, // Only show "Share" option if not already sharing URL
    cancelButtonText: 'Share',
    cancelButtonColor: '#3085d6'
  }).then((result) => {
    if (!isTooLong && result.dismiss === Swal.DismissReason.cancel) {
      navigator.clipboard.writeText(shortUrl).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'URL Copied!',
          text: 'The shareable short URL has been copied to your clipboard.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10B981'
        });
      });
    }
  });

  // After generating the code and showing the success message, clear the backup
  clearTierlistBackup();

  return shortCode || encodedCode;
}

// Render the tiers and pool, toggling editing state
function renderTierList() {
  const tierContainer = document.getElementById("tierContainer");
  const poolArea = document.getElementById("poolArea");
  const initialControls = document.getElementById("initialControls");
  const initialView = document.getElementById("initialView");
  const backButton = document.getElementById("backButton");
  const saveButton = document.getElementById("saveButton");
  const header = document.getElementById("header");
  const searchContainer = document.getElementById("searchContainer");
  const oldFlavorsToggleContainer = document.getElementById("oldFlavorsToggleContainer");
  const rankFlavorsText = document.querySelector(".rank-flavors-text");

  if (draggableInstance) {
    draggableInstance.destroy();
    draggableInstance = null;
  }

  tierContainer.innerHTML = "";
  poolArea.innerHTML = "";

  if (isEditing) {
    document.body.classList.add("tierlist-visible");
    tierContainer.classList.remove("hidden");
    poolArea.classList.remove("hidden");
    searchContainer.classList.remove("hidden");
    oldFlavorsToggleContainer.classList.remove("hidden");
    saveButton.classList.remove("hidden");
    initialControls.classList.add("hidden");
    backButton.classList.remove("hidden");
    header.classList.add("with-back-button");
    initialView.classList.remove("flex-1", "flex", "flex-col", "justify-center");
    rankFlavorsText.classList.remove("hidden");

    TIERS.forEach(({ name, color }) => {
      const row = document.createElement("div");
      row.className = "tier-row";
      row.innerHTML = `
        <div class="label-holder" style="background-color: ${color};">
          <span class="label">${name}</span>
        </div>
        <div class="tier" data-tier="${name}"></div>
      `;
      tierContainer.appendChild(row);
    });

    const usedFlavors = new Set();

    for (const tier in tierList) {
      const tierEl = document.querySelector(`.tier[data-tier="${tier}"]`);
      if (!tierEl) continue;

      tierList[tier].forEach(flavorName => {
        const flavor = flavors.find(f => f.name === flavorName);
        if (flavor) {
          const itemDiv = document.createElement("div");
          itemDiv.className = "tier-item";
          itemDiv.dataset.name = flavor.name;
          itemDiv.innerHTML = `<img src="images/${flavor.image}" alt="${flavor.name}">`;
          tierEl.appendChild(itemDiv);
          usedFlavors.add(flavor.name);
        }
      });
    }

    // Filter flavors for pool based on showOldFlavors toggle
    flavors.forEach(flavor => {
      if (!usedFlavors.has(flavor.name) && (showOldFlavors || !flavor.old)) {
        const itemDiv = document.createElement("div");
        itemDiv.className = "pool-item";
        itemDiv.dataset.name = flavor.name;
        itemDiv.innerHTML = `<img src="images/${flavor.image}" alt="${flavor.name}">`;
        poolArea.appendChild(itemDiv);
      }
    });

    setupDraggable();
    setupSearch();
    setupOldFlavorsToggle();
  } else {
    document.body.classList.remove("tierlist-visible");
    tierContainer.classList.add("hidden");
    poolArea.classList.add("hidden");
    searchContainer.classList.add("hidden");
    oldFlavorsToggleContainer.classList.add("hidden");
    saveButton.classList.add("hidden");
    initialControls.classList.remove("hidden");
    backButton.classList.add("hidden");
    header.classList.remove("with-back-button");
    initialView.classList.add("flex-1", "flex", "flex-col", "justify-center");
    rankFlavorsText.classList.add("hidden");
  }
}

// Add a function to count old flavors
function countOldFlavors() {
  return flavors.filter(flavor => flavor.old === true).length;
}

// Update toggle appearance based on state
function updateToggleAppearance(toggleElement) {
  // No need to manually update appearance, CSS handles it now
  // The function is kept for compatibility
}

// Update the text in the toggle to show number of old flavors
function updateOldFlavorsToggleText() {
  const oldFlavorsCount = countOldFlavors();
  const toggleLabel = document.querySelector('#oldFlavorsToggleContainer .flex.items-center span');
  if (toggleLabel) {
    toggleLabel.textContent = `Show ${oldFlavorsCount} Extra (old) flavors`;
  }
}

// Add function to setup toggle for old flavors
function setupOldFlavorsToggle() {
  const toggleCheckbox = document.getElementById("toggleOldFlavors");

  if (!toggleCheckbox) return; // Safety check

  // Update the toggle text with the count
  updateOldFlavorsToggleText();

  // Set initial state
  toggleCheckbox.checked = showOldFlavors;

  // Remove existing listeners to prevent duplicates
  toggleCheckbox.removeEventListener("change", handleToggleChange);

  // Add change listener
  toggleCheckbox.addEventListener("change", handleToggleChange);
}

// Separate function to handle toggle changes
function handleToggleChange() {
  showOldFlavors = this.checked;
  updateToggleAppearance(this);

  // Save the current search text before re-rendering
  const searchInput = document.getElementById("searchInput");
  const currentSearchText = searchInput ? searchInput.value : "";

  // Completely re-render the tierlist instead of just updating the pool
  // This maintains the correct draggable behavior
  if (draggableInstance) {
    draggableInstance.destroy();
    draggableInstance = null;
  }
  renderTierList();

  // Restore the search text after re-rendering
  if (currentSearchText) {
    const newSearchInput = document.getElementById("searchInput");
    if (newSearchInput) {
      newSearchInput.value = currentSearchText;
      // Trigger the search to apply filtering with the restored text
      newSearchInput.dispatchEvent(new Event('input'));
    }
  }
}

// Setup search functionality for pool items
function setupSearch() {
  const searchInput = document.getElementById("searchInput");

  // Don't reset the input value here
  // searchInput.value = ""; <- Remove or comment out this line

  // Remove existing listeners to prevent duplicates
  const newSearchInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);

  newSearchInput.addEventListener("input", function() {
    const searchText = this.value.toLowerCase().replace(/\s+/g, '');

    // Process any lingering class transformations first
    processItemClassTransformations();

    if (searchText === '') {
      // Show all items in pool when search is empty
      document.querySelectorAll('.pool-item').forEach(item => {
        item.style.display = '';
      });
    } else {
      // Filter items based on search text
      document.querySelectorAll('.pool-item').forEach(item => {
        const name = item.dataset.name.toLowerCase().replace(/\s+/g, '');
        if (name.includes(searchText)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    }
  });
}

// Helper function to count character frequencies
function getCharacterFrequency(str) {
  const charFreq = {};
  for (const char of str) {
    charFreq[char] = (charFreq[char] || 0) + 1;
  }
  return charFreq;
}

// Setup Shopify Draggable with improved event handling
function setupDraggable() {
  const containers = [
    ...document.querySelectorAll('.tier'),
    document.querySelector('.pool')
  ];

  draggableInstance = new Draggable.Sortable(containers, {
    draggable: '.tier-item, .pool-item',
    mirror: {
      appendTo: 'body',
      constrainDimensions: true
    },
    plugins: [Draggable.Plugins.ResizeMirror]
  });

  draggableInstance.on('drag:start', () => {
    document.body.style.cursor = 'grabbing';
  });

  draggableInstance.on('drag:stop', () => {
    document.body.style.cursor = '';
    // Process transformations immediately after drag stops
    processItemClassTransformations();
    // Update the tierList after classes are processed
    updateTierList();
  });

  draggableInstance.on('sortable:stop', (event) => {
    const allContainers = document.querySelectorAll('.tier, .pool');
    allContainers.forEach(container => {
      container.classList.remove('drop-active');
    });

    // Process transformations and update tierList right after sorting
    setTimeout(() => {
      processItemClassTransformations();
      updateTierList();
    }, 0);
  });

  // We don't need to call updateTierList here as it might cause duplicates
  // during the sorting operation. We'll update only after sorting is complete.
  draggableInstance.on('sortable:sorted', () => {
    // No immediate update - wait for sortable:stop event
  });

  draggableInstance.on('sortable:over', (event) => {
    event.overContainer.classList.add('drop-active');
  });

  draggableInstance.on('sortable:out', (event) => {
    event.overContainer.classList.remove('drop-active');
  });
}

// Improved helper function to handle class transformations
function processItemClassTransformations() {
  // First, get all elements in the pool area with tier-item class
  const poolItems = document.querySelectorAll('.pool .tier-item');
  poolItems.forEach(item => {
    item.classList.remove('tier-item');
    item.classList.add('pool-item');
  });

  // Then, get all elements in tier areas with pool-item class
  const tierItems = document.querySelectorAll('.tier .pool-item');
  tierItems.forEach(item => {
    item.classList.remove('pool-item');
    item.classList.add('tier-item');
  });
}

// Update the tierList object based on current DOM arrangement
function updateTierList() {
  // Clear all tiers first
  TIERS.forEach(tier => {
    tierList[tier.name] = [];
  });

  // Process class transformations to ensure correct classes
  processItemClassTransformations();

  // Track processed items to prevent duplicates
  const processedItems = new Set();

  // Only collect tier-items (not pool-items) from each tier
  TIERS.forEach(tier => {
    const tierElement = document.querySelector(`.tier[data-tier="${tier.name}"]`);
    // Only get tier-items, not pool-items
    const items = tierElement.querySelectorAll('.tier-item');

    items.forEach(item => {
      if (item.dataset.name && !processedItems.has(item.dataset.name)) {
        tierList[tier.name].push(item.dataset.name);
        processedItems.add(item.dataset.name);
      }
    });
  });

  // Save to localStorage if we're in editing mode
  if (isEditing) {
    localStorage.setItem('gfuel-tierlist-backup', JSON.stringify(tierList));
    localStorage.setItem('gfuel-tierlist-showOldFlavors', showOldFlavors);
  }

  console.log("Updated tier list:", JSON.parse(JSON.stringify(tierList)));
}

// Clear the localStorage backup
function clearTierlistBackup() {
  localStorage.removeItem('gfuel-tierlist-backup');
  localStorage.removeItem('gfuel-tierlist-showOldFlavors');
}

// Go back to the initial screen and clear backup
function goBack() {
  clearTierlistBackup();
  const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
  window.location.href = baseUrl;
}

// Check for backup on page load
function checkForBackup() {
  const backupData = localStorage.getItem('gfuel-tierlist-backup');
  if (backupData) {
    try {
      const savedTierList = JSON.parse(backupData);
      const savedShowOldFlavors = localStorage.getItem('gfuel-tierlist-showOldFlavors') === 'true';

      // Restore the tierlist state
      tierList = savedTierList;
      showOldFlavors = savedShowOldFlavors;
      isEditing = true;

      // Render the restored tierlist
      renderTierList();

      // Show a notification
      Swal.fire({
        icon: 'info',
        title: 'Tierlist Restored',
        text: 'Your previous tierlist has been restored from backup.',
        confirmButtonText: 'Continue Editing',
        showCancelButton: true,
        cancelButtonText: 'Discard',
      }).then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel) {
          // User chose to discard the backup
          clearTierlistBackup();
          goBack();
        }
      });

      return true;
    } catch (error) {
      console.error("Error restoring backup:", error);
      clearTierlistBackup();
    }
  }
  return false;
}

// Debug function to log the current state of the tier list
function logTierList() {
  console.log("Current Tier List:");
  for (const tier in tierList) {
    console.log(`${tier}: ${tierList[tier].join(', ')}`);
  }
}

// Show help instructions
function showHelp() {
  Swal.fire({
    title: 'How to Use the G-Fuel Tier List',
    html: `
      <div class="text-left">
        <h3 class="font-bold text-lg mb-2">What to do:</h3>
        <ol class="list-decimal pl-6 space-y-2">
          <li><strong>Complete your tierlist</strong> - Drag flavors from the pool into your preferred tiers</li>
          <li><strong>Export the tierlist</strong> - Click the Save button when you're done to generate a code</li>
          <li><strong>Save your list</strong> - Paste the generated command in Discord to update and save your tierlist</li>
        </ol>
        <div class="mt-4">
          <p class="font-bold">To share your tierlist:</p>
          <p>Use the link that appears after saving to share with others</p>
        </div>
        <div class="mt-4">
          <p class="font-bold">To load an existing tierlist:</p>
          <p>Enter your code on the main page and click "Load from Code"</p>
        </div>
      </div>
    `,
    confirmButtonText: 'Got it!',
    confirmButtonColor: '#3085d6',
    width: '600px'
  });
}

// Function to handle scroll-to-top button visibility and functionality
function setupScrollToTopButton() {
  const scrollTopButton = document.getElementById('scrollTopButton');

  // Show/hide the button based on scroll position
  function toggleScrollButtonVisibility() {
    if (window.scrollY > 300) {
      scrollTopButton.classList.add('visible');
      scrollTopButton.classList.remove('hidden');
    } else {
      scrollTopButton.classList.remove('visible');
      scrollTopButton.classList.add('hidden');
    }
  }

  // Scroll to top when button is clicked
  scrollTopButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  // Check scroll position on scroll
  window.addEventListener('scroll', toggleScrollButtonVisibility);

  // Initial check for button visibility
  toggleScrollButtonVisibility();
}

// Add this to your DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", function() {
  fetchFlavors();
  setupScrollToTopButton();
});