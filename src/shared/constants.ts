export const MESSAGE_TYPES = {
  EXTRACT_PAGE: 'EXTRACT_PAGE',
  EXTRACTION_RESULT: 'EXTRACTION_RESULT',
  EXTRACTION_ERROR: 'EXTRACTION_ERROR',
} as const;

/** Maximum content length in characters before truncation (~200K chars) */
export const MAX_CONTENT_LENGTH = 200_000;

/** MutationObserver timeout in milliseconds for SPA content loading */
export const MUTATION_OBSERVER_TIMEOUT = 2_000;

/** Minimum character count to consider content valid (triggers SPA wait if below) */
export const MIN_CONTENT_LENGTH = 100;

/** Words per minute for reading time calculation */
export const READING_SPEED_WPM = 200;

/** Duration in milliseconds to show "Copied!" feedback before reverting */
export const COPIED_FEEDBACK_DURATION = 1_500;

/** Truncation notice appended when content exceeds MAX_CONTENT_LENGTH */
export const TRUNCATION_NOTICE =
  '\n\n---\n*Content truncated at 200,000 characters*';

/** Semantic selectors for fallback content extraction (layer 2) */
export const SEMANTIC_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
] as const;

/** Selectors for elements to remove during aggressive body fallback (layer 3) */
export const NOISE_SELECTORS = [
  'script',
  'style',
  'nav',
  'footer',
  'header',
  'aside',
  'noscript',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
] as const;
