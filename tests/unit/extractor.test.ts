import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  extractContent,
  extractWithReadability,
  extractWithSemanticSelectors,
  extractWithBodyFallback,
  truncateContent,
  countWords,
  buildMetadata,
  waitForContent,
} from '../../src/content/extractor';
import { MAX_CONTENT_LENGTH, TRUNCATION_NOTICE } from '../../src/shared/constants';

function loadFixture(name: string): Document {
  const html = readFileSync(resolve(__dirname, '../fixtures', name), 'utf-8');
  const dom = new JSDOM(html, { url: 'https://example.com/test' });
  return dom.window.document;
}

describe('extractWithReadability', () => {
  it('extracts article content from well-structured HTML', () => {
    const doc = loadFixture('article.html');
    const result = extractWithReadability(doc);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Test Article Title');
    expect(result!.html).toContain('test article');
    expect(result!.textContent.length).toBeGreaterThan(100);
  });

  it('returns null for empty pages', () => {
    const doc = loadFixture('empty.html');
    const result = extractWithReadability(doc);
    expect(result).toBeNull();
  });
});

describe('extractWithSemanticSelectors', () => {
  it('extracts content from <main> element', () => {
    const doc = loadFixture('semantic-only.html');
    const result = extractWithSemanticSelectors(doc);
    expect(result).not.toBeNull();
    expect(result!.html).toContain('main content area');
    expect(result!.title).toBe('Semantic Page');
  });

  it('returns null when no semantic elements have enough content', () => {
    const doc = loadFixture('empty.html');
    const result = extractWithSemanticSelectors(doc);
    expect(result).toBeNull();
  });
});

describe('extractWithBodyFallback', () => {
  it('extracts body text after removing noise elements', () => {
    const doc = loadFixture('minimal.html');
    const result = extractWithBodyFallback(doc);
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain('plain text content');
  });

  it('removes script and style tags', () => {
    const doc = loadFixture('empty.html');
    const result = extractWithBodyFallback(doc);
    // After removing script/style, there should be little to no content
    if (result) {
      expect(result.textContent).not.toContain('console.log');
      expect(result.textContent).not.toContain('margin');
    }
  });
});

describe('extractContent (3-layer fallback)', () => {
  it('uses Readability for article pages', () => {
    const doc = loadFixture('article.html');
    const result = extractContent(doc);
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain('test article');
  });

  it('falls through to semantic selectors when needed', () => {
    const doc = loadFixture('semantic-only.html');
    const result = extractContent(doc);
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain('main content area');
  });

  it('falls through to body fallback for minimal pages', () => {
    const doc = loadFixture('minimal.html');
    const result = extractContent(doc);
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain('plain text content');
  });
});

describe('truncateContent', () => {
  it('returns content unchanged when under limit', () => {
    const short = 'Hello world';
    expect(truncateContent(short)).toBe(short);
  });

  it('returns content unchanged at exactly the limit', () => {
    const exact = 'a'.repeat(MAX_CONTENT_LENGTH);
    expect(truncateContent(exact)).toBe(exact);
  });

  it('truncates and appends notice when over limit', () => {
    const long = 'a'.repeat(MAX_CONTENT_LENGTH + 500);
    const result = truncateContent(long);
    expect(result).toHaveLength(MAX_CONTENT_LENGTH + TRUNCATION_NOTICE.length);
    expect(result.endsWith(TRUNCATION_NOTICE)).toBe(true);
  });
});

describe('countWords', () => {
  it('counts English words', () => {
    expect(countWords('Hello world foo bar')).toBe(4);
  });

  it('counts CJK characters as individual words', () => {
    expect(countWords('你好世界')).toBe(4);
  });

  it('counts mixed CJK and English', () => {
    expect(countWords('Hello 你好 world')).toBe(4);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   ')).toBe(0);
  });
});

describe('buildMetadata', () => {
  it('builds metadata with correct fields', () => {
    const before = new Date().toISOString();
    const meta = buildMetadata('Title', 'https://example.com', 'one two three four five');
    const after = new Date().toISOString();

    expect(meta.title).toBe('Title');
    expect(meta.url).toBe('https://example.com');
    expect(meta.extractedAt >= before).toBe(true);
    expect(meta.extractedAt <= after).toBe(true);
    expect(meta.wordCount).toBe(5);
    expect(meta.readingTimeMinutes).toBe(1);
  });

  it('calculates reading time correctly for longer content', () => {
    const words = Array.from({ length: 1000 }, () => 'word').join(' ');
    const meta = buildMetadata('Title', 'https://example.com', words);
    expect(meta.wordCount).toBe(1000);
    expect(meta.readingTimeMinutes).toBe(5);
  });

  it('has minimum reading time of 1 minute', () => {
    const meta = buildMetadata('Title', 'https://example.com', 'short');
    expect(meta.readingTimeMinutes).toBe(1);
  });
});

describe('waitForContent', () => {
  it('resolves immediately when content is already sufficient', async () => {
    const doc = loadFixture('article.html');
    await expect(waitForContent(doc)).resolves.toBeUndefined();
  });

  it('resolves after timeout when content remains insufficient', async () => {
    vi.useFakeTimers();
    const doc = loadFixture('empty.html');
    const promise = waitForContent(doc);
    vi.advanceTimersByTime(2000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
