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

  checkURLforCode();
  renderTierList();
}

// Check if URL contains a code parameter and load the tier list
function checkURLforCode() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("c");

  if (code) {
    loadTierListFromCode(code);
    console.log("Loaded tier list from URL code");

    url.searchParams.delete("c");
    const cleanPathname = url.pathname.replace(/\$/, '/');
    window.history.pushState({}, document.title, cleanPathname);

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
  loadTierListFromCode(inputCode);
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

  const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
  const shareableUrl = `${baseUrl}?c=${encodedCode}`;

  navigator.clipboard.writeText(`/update code:${encodedCode}`);
  Swal.fire({
    icon: encodedCode === "new" ? 'error' : 'success',
    title: encodedCode === "new" ? 'Just a Minute!' : 'Important!',
    html: `<div class="text-center">
            <p>${encodedCode === "new" ? "Your tier list cannot be exported." : "You still have one more step to save."}</p>
            ${
              encodedCode === "new"
                ? `<p class="text-2xl font-bold mt-2 mb-4">No Tierlist!</p>
                   <p class="text-red-500">Empty tierlists cannot be saved</p>`
                : `<p>The tier list still needs to be added to the global rankings by running:</p>
                   <p class="text-2xl font-bold mt-2 mb-4 break-all">/update code:${encodedCode}</p>
                   <p class="text-sm">This command has been copied to your clipboard.</p>`
            }
          </div>`,
    confirmButtonText: 'OK',
    confirmButtonColor: '#10B981',
    showCancelButton: true,
    cancelButtonText: 'Share',
    cancelButtonColor: '#3085d6'
  }).then((result) => {
    if (result.dismiss === Swal.DismissReason.cancel) {
      navigator.clipboard.writeText(shareableUrl).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'URL Copied!',
          text: 'The shareable URL has been copied to your clipboard.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10B981'
        });
      });
    }
  });

  return encodedCode;
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

  // Completely re-render the tierlist instead of just updating the pool
  // This maintains the correct draggable behavior
  if (draggableInstance) {
    draggableInstance.destroy();
    draggableInstance = null;
  }
  renderTierList();
}

// Setup search functionality for pool items
function setupSearch() {
  const searchInput = document.getElementById("searchInput");

  searchInput.value = "";

  searchInput.addEventListener("input", function() {
    const searchText = this.value.toLowerCase().replace(/\s+/g, '');

    // Process any lingering class transformations first
    processItemClassTransformations();

    if (searchText === '') {
      document.querySelectorAll(".pool-item").forEach(item => {
        item.style.display = "";
      });
      return;
    }

    const searchCharFreq = getCharacterFrequency(searchText);
    // Only select pool items that are actually IN the pool container
    const poolItems = document.querySelector('.pool').querySelectorAll(".pool-item");

    poolItems.forEach(item => {
      const flavorName = item.dataset.name.toLowerCase().replace(/\s+/g, '');
      const flavorCharFreq = getCharacterFrequency(flavorName);

      let isMatch = true;
      for (const [char, count] of Object.entries(searchCharFreq)) {
        if (!flavorCharFreq[char] || flavorCharFreq[char] < count) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        item.style.display = "";
      } else {
        item.style.display = "none";
      }
    });
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

  console.log("Updated tier list:", JSON.parse(JSON.stringify(tierList)));
}

// Go back to the initial screen
function goBack() {
  const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
  window.location.href = baseUrl;
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