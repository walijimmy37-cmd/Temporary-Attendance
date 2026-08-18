/**
 * Normalizes a person's name:
 * - Trims leading/trailing whitespace
 * - Collapses consecutive spaces
 * - Capitalizes each word properly (supporting hyphens and apostrophes)
 * - Limits length to maxLength (default 100)
 */
export function normalizeName(input: string, maxLength: number = 100): string {
  if (!input) return '';

  // Trim and collapse multiple spaces
  const cleaned = input.trim().replace(/\s+/g, ' ');

  if (cleaned.length === 0) return '';

  // Truncate to maximum characters
  const truncated = cleaned.slice(0, maxLength);

  // Capitalize words while respecting apostrophes and hyphens
  return truncated
    .split(' ')
    .map(word => {
      // Handle hyphenated parts (e.g. Jean-Luc)
      return word
        .split('-')
        .map(subWord => {
          // Handle apostrophes (e.g. O'Connor, d'Angelo)
          return subWord
            .split("'")
            .map(part => {
              if (part.length === 0) return '';
              return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            })
            .join("'");
        })
        .join('-');
    })
    .join(' ');
}

export function validateName(name: string): { isValid: boolean; error?: string; normalized: string } {
  const normalized = normalizeName(name);

  if (!normalized || normalized.length === 0) {
    return {
      isValid: false,
      error: 'Please enter your full name.',
      normalized: ''
    };
  }

  if (normalized.length < 2) {
    return {
      isValid: false,
      error: 'Name must be at least 2 characters.',
      normalized
    };
  }

  if (normalized.length > 100) {
    return {
      isValid: false,
      error: 'Name must not exceed 100 characters.',
      normalized: normalized.slice(0, 100)
    };
  }

  // Basic sanity check: allow letters, spaces, hyphens, periods, and apostrophes
  const validPattern = /^[\p{L}\p{M}\s.'-]+$/u;
  if (!validPattern.test(normalized)) {
    return {
      isValid: false,
      error: 'Name contains invalid characters.',
      normalized
    };
  }

  return {
    isValid: true,
    normalized
  };
}
