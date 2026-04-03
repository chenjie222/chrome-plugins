import { describe, it, expect } from 'vitest';
import {
  isExtractionResult,
  isExtractionError,
} from '../../src/shared/types';
import type { Message } from '../../src/shared/types';
import {
  MAX_CONTENT_LENGTH,
  MUTATION_OBSERVER_TIMEOUT,
} from '../../src/shared/constants';

describe('type guards', () => {
  const extractRequest: Message = { type: 'EXTRACT_PAGE' };

  const extractionResult: Message = {
    type: 'EXTRACTION_RESULT',
    data: {
      markdown: '# Hello',
      metadata: {
        title: 'Hello',
        url: 'https://example.com',
        extractedAt: '2026-04-03T00:00:00Z',
        wordCount: 100,
        readingTimeMinutes: 1,
      },
    },
  };

  const extractionError: Message = {
    type: 'EXTRACTION_ERROR',
    error: {
      code: 'NO_CONTENT',
      message: 'No content found',
    },
  };

  describe('isExtractionResult', () => {
    it('returns true for EXTRACTION_RESULT messages', () => {
      expect(isExtractionResult(extractionResult)).toBe(true);
    });

    it('returns false for non-EXTRACTION_RESULT messages', () => {
      expect(isExtractionResult(extractRequest)).toBe(false);
      expect(isExtractionResult(extractionError)).toBe(false);
    });
  });

  describe('isExtractionError', () => {
    it('returns true for EXTRACTION_ERROR messages', () => {
      expect(isExtractionError(extractionError)).toBe(true);
    });

    it('returns false for non-EXTRACTION_ERROR messages', () => {
      expect(isExtractionError(extractRequest)).toBe(false);
      expect(isExtractionError(extractionResult)).toBe(false);
    });
  });
});

describe('constants', () => {
  it('MAX_CONTENT_LENGTH is 200000', () => {
    expect(MAX_CONTENT_LENGTH).toBe(200000);
  });

  it('MUTATION_OBSERVER_TIMEOUT is 2000', () => {
    expect(MUTATION_OBSERVER_TIMEOUT).toBe(2000);
  });
});
