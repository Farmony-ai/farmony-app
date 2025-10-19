// Text normalization for search
export const normalizeSearchText = (value: string): string =>
  value?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';

// Build search variants (singular/plural)
export const buildSearchVariants = (value: string): string[] => {
  const base = normalizeSearchText(value);
  if (!base) {
    return [];
  }
  const variants = new Set<string>([base]);

  // Handle pluralization
  if (base.endsWith('s')) {
    variants.add(base.slice(0, -1));
  }
  // Add base without trailing 's'
  variants.add(base.replace(/s$/g, ''));

  return Array.from(variants).filter(Boolean);
};

// Subsequence matching (e.g., "trctr" matches "tractor")
export const subsequenceMatch = (needle: string, haystack: string): boolean => {
  let idx = 0;
  for (let i = 0; i < haystack.length && idx < needle.length; i += 1) {
    if (haystack[i] === needle[idx]) {
      idx += 1;
    }
  }
  return idx === needle.length;
};

// Main fuzzy matching function
export const fuzzyMatch = (query: string, candidate: string): boolean => {
  const queryVariants = buildSearchVariants(query);
  const candidateVariants = buildSearchVariants(candidate);

  if (!queryVariants.length) {
    return true; // Empty query matches everything
  }

  for (const q of queryVariants) {
    for (const c of candidateVariants) {
      if (!q || !c) {
        continue;
      }
      // Check if either contains the other
      if (c.includes(q) || q.includes(c)) {
        return true;
      }
      // Check subsequence match
      if (subsequenceMatch(q, c)) {
        return true;
      }
    }
  }

  return false;
};

// Get match indices for highlighting
export const getMatchIndices = (text: string, query: string): [number, number][] => {
  if (!query || !text) {
    return [];
  }

  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const indices: [number, number][] = [];

  // Try exact match first
  let startIndex = normalizedText.indexOf(normalizedQuery);
  if (startIndex !== -1) {
    indices.push([startIndex, startIndex + normalizedQuery.length]);
    return indices;
  }

  // Try variant matches
  const variants = buildSearchVariants(query);
  for (const variant of variants) {
    startIndex = normalizedText.indexOf(variant);
    if (startIndex !== -1) {
      indices.push([startIndex, startIndex + variant.length]);
      return indices;
    }
  }

  // For subsequence matches, highlight individual characters
  if (subsequenceMatch(normalizedQuery, normalizedText)) {
    let queryIdx = 0;
    for (let i = 0; i < text.length && queryIdx < normalizedQuery.length; i++) {
      if (normalizedText[i] === normalizedQuery[queryIdx]) {
        indices.push([i, i + 1]);
        queryIdx++;
      }
    }
  }

  return indices;
};

// Calculate match score for sorting (optional future enhancement)
export const getMatchScore = (query: string, candidate: string): number => {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedCandidate = normalizeSearchText(candidate);

  // Exact match gets highest score
  if (normalizedCandidate === normalizedQuery) {
    return 1.0;
  }

  // Starts with query
  if (normalizedCandidate.startsWith(normalizedQuery)) {
    return 0.8;
  }

  // Contains query
  if (normalizedCandidate.includes(normalizedQuery)) {
    return 0.6;
  }

  // Fuzzy match
  if (fuzzyMatch(query, candidate)) {
    return 0.4;
  }

  return 0;
};
