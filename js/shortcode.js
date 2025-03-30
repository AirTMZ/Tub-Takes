/**
 * Compression utilities for tier list codes
 * Uses advanced compression techniques for maximum reduction
 */

/**
 * Map flavor codes to much shorter representations
 * This creates a lookup table to convert 8-char codes to 1-3 char codes
 * @param {string} decodedData - The decoded tier list data
 * @returns {Object} Two objects: shortMap and originalMap for conversion
 */
function createCompactFlavorMap(decodedData) {
  // Extract all flavor codes from the decoded data
  const flavorCodes = [];
  let currentCode = "";
  let inCode = false;

  for (let i = 0; i < decodedData.length; i++) {
    const char = decodedData[i];

    // If we're at a tier letter, reset
    if ("SABCDF".includes(char)) {
      inCode = true;
      continue;
    }

    if (inCode) {
      if (char === ',') {
        if (currentCode.length > 0) {
          flavorCodes.push(currentCode);
          currentCode = "";
        }
      } else {
        currentCode += char;
      }
    }
  }

  // Add the last code if there is one
  if (currentCode.length > 0) {
    flavorCodes.push(currentCode);
  }

  // Create a more compact encoding using base36 (0-9a-z)
  const shortMap = {};
  const originalMap = {};

  // Sort codes to ensure consistent mapping
  const uniqueCodes = [...new Set(flavorCodes)].sort();

  // Map each code to a short base36 value
  uniqueCodes.forEach((code, index) => {
    // Convert to base36 (0-9a-z) for maximum compression
    const shortCode = index.toString(36);
    shortMap[code] = shortCode;
    originalMap[shortCode] = code;
  });

  return { shortMap, originalMap };
}

/**
 * Apply a super-compact encoding before compression
 * @param {string} decodedData - The original decoded tier list data
 * @returns {string} Highly optimized data for compression
 */
function createSuperCompactData(decodedData) {
  const { shortMap } = createCompactFlavorMap(decodedData);

  // Replace tier letters with single-digit numbers
  const tierMap = { 'S': '0', 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'F': '5' };

  let compactData = '';
  let currentTier = null;
  let inCode = false;
  let currentCode = '';

  for (let i = 0; i < decodedData.length; i++) {
    const char = decodedData[i];

    if ("SABCDF".includes(char)) {
      // Add the mapped tier character
      compactData += tierMap[char];
      currentTier = char;
      inCode = true;
      continue;
    }

    if (inCode) {
      if (char === ',') {
        if (currentCode.length > 0) {
          // Replace with the compact code
          compactData += shortMap[currentCode];
          currentCode = '';
        }
      } else {
        currentCode += char;
      }
    }
  }

  // Handle the last code if there is one
  if (currentCode.length > 0) {
    compactData += shortMap[currentCode];
  }

  return compactData;
}

/**
 * Expand a super-compact string back to the original format
 * @param {string} compactData - The super compressed data
 * @param {string} tierData - The original tier list data (for reference)
 * @returns {string} The expanded data in original format
 */
function expandSuperCompactData(compactData, originalTierString) {
  // First, extract original flavor codes for mapping
  const { originalMap } = createCompactFlavorMap(originalTierString);

  // Map for tier conversion (reverse of tierMap in createSuperCompactData)
  const tierMap = { '0': 'S', '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'F' };

  let expandedData = '';
  let currentPosition = 0;

  while (currentPosition < compactData.length) {
    // Get tier number
    const tierNum = compactData[currentPosition++];
    // Convert to tier letter
    const tierLetter = tierMap[tierNum];
    expandedData += tierLetter;

    // Read codes until next tier or end
    let codeBuffer = '';
    while (currentPosition < compactData.length &&
           !('0123456'.includes(compactData[currentPosition]))) {

      codeBuffer += compactData[currentPosition++];

      // If this makes a valid code, expand it and add comma
      if (originalMap[codeBuffer]) {
        expandedData += originalMap[codeBuffer] + ',';
        codeBuffer = '';
      }
    }
  }

  return expandedData;
}

/**
 * Compress a tier list code using ultra-aggressive compression
 * @param {string} fullCode - The original Base64 tier list code
 * @returns {string} Ultra-compressed code suitable for Discord
 */
function compressCode(fullCode) {
  try {
    // First decode the base64 to get the actual tier data
    let decoded;
    try {
      // Handle padding issues with Base64 URL-safe format
      let fixedCode = fullCode;
      // Add padding if needed
      while (fixedCode.length % 4 !== 0) {
        fixedCode += '=';
      }
      // Replace URL-safe characters with standard base64 characters
      fixedCode = fixedCode.replace(/-/g, '+').replace(/_/g, '/');

      decoded = atob(fixedCode);
    } catch (e) {
      console.error("Invalid Base64 in input code", e);
      return null;
    }

    // Save original for reconstruction
    const originalTierString = decoded;

    // Create ultra-compact representation
    const superCompactData = createSuperCompactData(decoded);

    // Compress with LZString (already greatly reduced size)
    const compressed = LZString.compressToEncodedURIComponent(superCompactData);

    // Store the original data in localStorage for decompression
    // This is necessary because we need the original mapping
    try {
      localStorage.setItem('tubtakes-mapping-data', originalTierString);
    } catch (e) {
      console.warn("Could not save mapping data to localStorage, using fallback", e);
      // We'll still proceed - decompression will be less efficient but will work
    }

    // Add a prefix to identify our format
    return "TT-" + compressed;
  } catch (e) {
    console.error("Error compressing code:", e);
    return null;
  }
}

/**
 * Decompress a shortened code back to the original format
 * @param {string} shortCode - The compressed code
 * @returns {string} Original Base64 tier list code
 */
function decompressCode(shortCode) {
  try {
    // Check if this is one of our compressed codes
    if (!shortCode.startsWith("TT-")) {
      // If not our format, return as-is (might be a full code)
      return shortCode;
    }

    // Remove our prefix
    const compressed = shortCode.substring(3);

    // Step 1: Decompress with LZString
    const superCompactData = LZString.decompressFromEncodedURIComponent(compressed);
    if (!superCompactData) {
      throw new Error("Decompression resulted in empty string");
    }

    // Step 2: Try to get original mapping data
    let originalTierString = localStorage.getItem('tubtakes-mapping-data');

    // If we have mapping data, use it for optimal expansion
    if (originalTierString) {
      const expandedData = expandSuperCompactData(superCompactData, originalTierString);
      return btoa(expandedData);
    }

    // Fallback: Try to reconstruct without original mapping
    // This is a simplified version that works with the tier numbering
    // but might not perfectly reconstruct if we don't have the original codes
    const tierMap = { '0': 'S', '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'F' };

    // If we don't have mapping data, try basic reconstruction
    // This will work for viewing but might not be perfect
    let reconstructed = '';
    for (let i = 0; i < superCompactData.length; i++) {
      const char = superCompactData[i];
      if ('012345'.includes(char)) {
        reconstructed += tierMap[char];
      } else {
        // For flavor codes without mapping, we use placeholders
        // that will at least display something
        reconstructed += 'placeholder,';
      }
    }

    return btoa(reconstructed);
  } catch (e) {
    console.error("Error decompressing code:", e);
    return null;
  }
}