// All defined tiers and their associated colors (adjusted for better contrast with white text)
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

// Load flavor data, set up empty tier list, then render
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

  // Check URL for code parameter
  checkURLforCode();

  renderTierList();
}

// Check if URL contains a code parameter and load it
function checkURLforCode() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("c");

  if (code) {
    loadTierListFromCode(code);
    console.log("Loaded tier list from URL code");

    // Remove the code parameter and index.html from the URL without reloading the page
    url.searchParams.delete("c");
    const cleanPathname = url.pathname.replace(/\/index\.html$/, '/');
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

// Common function to load tier list from code
function loadTierListFromCode(inputCode) {
  // Reset tierList to empty
  tierList = TIERS.reduce((acc, tier) => {
    acc[tier.name] = [];
    return acc;
  }, {});

  try {
    const compactCode = atob(inputCode);
    console.log("Decoded code:", compactCode);

    // Create a map of image_id to flavor name
    const idFlavorMap = {};
    flavors.forEach(flavor => {
      if (flavor.image_id) {
        idFlavorMap[flavor.image_id] = flavor.name;
      }
    });
    console.log("ID to Flavor Map:", idFlavorMap);

    // Keep track of processed flavors to avoid duplicates
    const processedFlavors = new Set();

    // Parse the compact code using a clearer approach
    // Format is now: S1234567,7654321,T5432123,etc
    let currentTier = null;
    let currentId = "";
    let parsingId = false;

    for (let i = 0; i < compactCode.length; i++) {
      const char = compactCode[i];

      // Check if this is a tier identifier (S, A, B, C, D, F)
      if (TIERS.some(t => t.name === char) && !parsingId) {
        currentTier = char;
        parsingId = true;
        currentId = "";
        continue;
      }

      // If we're parsing an ID and encounter a comma, we've reached the end of this ID
      if (char === "," && parsingId) {
        if (currentId && currentTier) {
          const flavorName = idFlavorMap[currentId];
          if (flavorName && !processedFlavors.has(flavorName)) {
            if (TIERS.some(t => t.name === currentTier)) {
              tierList[currentTier].push(flavorName);
              processedFlavors.add(flavorName);
            }
          }
        }
        currentId = "";
        continue;
      }

      // If we're parsing an ID and encounter another tier identifier,
      // finalize the current ID and start a new tier
      if (TIERS.some(t => t.name === char) && parsingId) {
        if (currentId && currentTier) {
          const flavorName = idFlavorMap[currentId];
          if (flavorName && !processedFlavors.has(flavorName)) {
            if (TIERS.some(t => t.name === currentTier)) {
              tierList[currentTier].push(flavorName);
              processedFlavors.add(flavorName);
            }
          }
        }
        currentTier = char;
        currentId = "";
        continue;
      }

      // Otherwise, build up the current ID
      if (parsingId) {
        currentId += char;
      }
    }

    // Handle the last ID if there is one
    if (currentId && currentTier) {
      const flavorName = idFlavorMap[currentId];
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

// Create a new empty tier list for editing
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
  const flavorIdMap = {};
  flavors.forEach(flavor => {
    if (flavor.image_id) {
      flavorIdMap[flavor.name] = flavor.image_id;
    }
  });

  // First, ensure tierList is up-to-date with the current DOM state
  updateTierList();

  // Keep track of what's been encoded to prevent duplicates
  const encodedFlavors = new Set();
  let compactCode = '';

  for (const tier of TIERS) {
    const tierItems = tierList[tier.name] || [];
    if (tierItems.length > 0) {
      let tierCode = tier.name;
      let tierHasValidItems = false;

      tierItems.forEach(item => {
        const id = flavorIdMap[item];
        // Only add if we have an ID and haven't encoded this flavor yet
        if (id && !encodedFlavors.has(item)) {
          tierCode += id + ","; // Add a separator between IDs
          encodedFlavors.add(item);
          tierHasValidItems = true;
        }
      });

      // Only add tier if it has valid items
      if (tierHasValidItems) {
        compactCode += tierCode;
      }
    }
  }

  let encodedCode = compactCode ? btoa(compactCode) : "new";

  // Generate the shareable URL
  const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
  const shareableUrl = `${baseUrl}/index.html?c=${encodedCode}`;

  navigator.clipboard.writeText(encodedCode);
  Swal.fire({
    icon: 'success',
    title: 'Tier List Saved!',
    html: `<div class="text-center">
            <p>Your tier list code is:</p>
            <p class="text-2xl font-bold mt-2 mb-4">${encodedCode === "new" ? "Empty" : encodedCode}</p>
            <p class="text-sm">Code has been copied to clipboard</p>
            <p class="mt-4">Share this link:</p>
            <p class="text-sm text-blue-500 break-all mt-2">${shareableUrl}</p>
          </div>`,
    confirmButtonText: 'OK',
    confirmButtonColor: '#10B981',
  });
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

  // Destroy existing Draggable instance if it exists
  if (draggableInstance) {
    draggableInstance.destroy();
    draggableInstance = null;
  }

  tierContainer.innerHTML = "";
  poolArea.innerHTML = "";

  if (isEditing) {
    tierContainer.classList.remove("hidden");
    poolArea.classList.remove("hidden");
    searchContainer.classList.remove("hidden");
    saveButton.classList.remove("hidden");
    initialControls.classList.add("hidden");
    backButton.classList.remove("hidden");
    header.classList.add("with-back-button");
    // Remove centering in edit mode
    initialView.classList.remove("flex-1", "flex", "flex-col", "justify-center");

    // Create a row for each tier
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

    // Keep track of used flavors so we know what should remain in the pool
    const usedFlavors = new Set();

    // Add existing sorted flavors to their tiers
    for (const tier in tierList) {
      const tierEl = document.querySelector(`.tier[data-tier="${tier}"]`);
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

    // Anything unused stays in the pool
    flavors.forEach(flavor => {
      if (!usedFlavors.has(flavor.name)) {
        const itemDiv = document.createElement("div");
        itemDiv.className = "pool-item";
        itemDiv.dataset.name = flavor.name;
        itemDiv.innerHTML = `<img src="images/${flavor.image}" alt="${flavor.name}">`;
        poolArea.appendChild(itemDiv);
      }
    });

    setupDraggable();
    setupSearch();
  } else {
    tierContainer.classList.add("hidden");
    poolArea.classList.add("hidden");
    searchContainer.classList.add("hidden");
    saveButton.classList.add("hidden");
    initialControls.classList.remove("hidden");
    backButton.classList.add("hidden");
    header.classList.remove("with-back-button");
    // Add back centering for initial view
    initialView.classList.add("flex-1", "flex", "flex-col", "justify-center");
  }
}

// Setup search functionality for pool items
function setupSearch() {
  const searchInput = document.getElementById("searchInput");

  // Clear previous input
  searchInput.value = "";

  // Add event listener for search input
  searchInput.addEventListener("input", function() {
    const searchText = this.value.toLowerCase().replace(/\s+/g, '');

    // If search is empty, show all items
    if (searchText === '') {
      document.querySelectorAll(".pool-item").forEach(item => {
        item.style.display = "";
      });
      return;
    }

    // Get character frequency map for search text
    const searchCharFreq = getCharacterFrequency(searchText);
    const poolItems = document.querySelectorAll(".pool-item");

    poolItems.forEach(item => {
      const flavorName = item.dataset.name.toLowerCase().replace(/\s+/g, '');
      const flavorCharFreq = getCharacterFrequency(flavorName);

      // Check if flavor contains all characters from the search
      let isMatch = true;
      for (const [char, count] of Object.entries(searchCharFreq)) {
        if (!flavorCharFreq[char] || flavorCharFreq[char] < count) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        item.style.display = ""; // Show item
      } else {
        item.style.display = "none"; // Hide item
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

// Set up Shopify Draggable
function setupDraggable() {
  // Define all containers that will participate in drag/drop operations
  const containers = [
    ...document.querySelectorAll('.tier'),
    document.querySelector('.pool')
  ];

  // Initialize Draggable
  draggableInstance = new Draggable.Sortable(containers, {
    draggable: '.tier-item, .pool-item',
    mirror: {
      appendTo: 'body',
      constrainDimensions: true
    },
    plugins: [Draggable.Plugins.ResizeMirror]
  });

  // Handle drag start
  draggableInstance.on('drag:start', (event) => {
    document.body.style.cursor = 'grabbing';
  });

  // Handle drag stop
  draggableInstance.on('drag:stop', (event) => {
    document.body.style.cursor = '';
  });

  // Handle sorting between containers
  draggableInstance.on('sortable:sorted', (event) => {
    updateTierList();
  });

  // Update class when dragging over container
  draggableInstance.on('sortable:over', (event) => {
    event.overContainer.classList.add('drop-active');
  });

  // Remove class when dragging out of container
  draggableInstance.on('sortable:out', (event) => {
    event.overContainer.classList.remove('drop-active');
  });

  // Make sure items maintain correct class based on their container
  draggableInstance.on('sortable:stop', (event) => {
    const allContainers = document.querySelectorAll('.tier, .pool');
    allContainers.forEach(container => {
      container.classList.remove('drop-active');
    });

    // Update classes based on container
    const poolItems = document.querySelectorAll('.pool .tier-item');
    poolItems.forEach(item => {
      item.classList.remove('tier-item');
      item.classList.add('pool-item');
    });

    const tierItems = document.querySelectorAll('.tier .pool-item');
    tierItems.forEach(item => {
      item.classList.remove('pool-item');
      item.classList.add('tier-item');
    });
  });
}

// Update the tierList object based on current DOM arrangement
function updateTierList() {
  // Reset the tierList
  TIERS.forEach(tier => {
    tierList[tier.name] = [];
  });

  // Update it based on the current DOM arrangement
  TIERS.forEach(tier => {
    const tierElement = document.querySelector(`.tier[data-tier="${tier.name}"]`);
    // Only consider tier-item in tiers
    const items = tierElement.querySelectorAll('.tier-item, .pool-item');  // Include both to catch any item that might be mid-transition
    items.forEach(item => {
      if (item.dataset.name) {
        tierList[tier.name].push(item.dataset.name);
      }
    });
  });

  console.log("Updated tier list:", JSON.parse(JSON.stringify(tierList)));
}

// Go back to initial screen
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

// Start by fetching flavors
document.addEventListener("DOMContentLoaded", fetchFlavors);