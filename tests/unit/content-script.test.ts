import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { MESSAGE_TYPES } from '../../src/shared/constants';

function loadFixtureHtml(name: string): string {
  return readFileSync(resolve(__dirname, '../fixtures', name), 'utf-8');
}

function setupDom(html: string): JSDOM {
  const dom = new JSDOM(html, { url: 'https://example.com/test-article' });
  return dom;
}

describe('handleExtractPage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns ExtractionResult with markdown and metadata for article pages', async () => {
    const html = loadFixtureHtml('article.html');
    const dom = setupDom(html);

    // Stub globals before importing the module
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('chrome', {
      runtime: { onMessage: { addListener: vi.fn() } },
    });

    const { handleExtractPage } = await import('../../src/content/index');
    const result = await handleExtractPage();

    expect(result.type).toBe(MESSAGE_TYPES.EXTRACTION_RESULT);
    if (result.type === MESSAGE_TYPES.EXTRACTION_RESULT) {
      expect(result.data.markdown).toContain('---');
      expect(result.data.markdown).toContain('title:');
      expect(result.data.metadata.title).toBeTruthy();
      expect(result.data.metadata.url).toBe('https://example.com/test-article');
      expect(result.data.metadata.extractedAt).toBeTruthy();
      expect(result.data.metadata.wordCount).toBeGreaterThan(0);
      expect(result.data.metadata.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    }

    vi.unstubAllGlobals();
  });

  it('returns NO_CONTENT error for empty pages', async () => {
    const html = loadFixtureHtml('empty.html');
    const dom = setupDom(html);

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('chrome', {
      runtime: { onMessage: { addListener: vi.fn() } },
    });

    const { handleExtractPage } = await import('../../src/content/index');
    const result = await handleExtractPage();

    expect(result.type).toBe(MESSAGE_TYPES.EXTRACTION_ERROR);
    if (result.type === MESSAGE_TYPES.EXTRACTION_ERROR) {
      expect(result.error.code).toBe('NO_CONTENT');
      expect(result.error.message).toBeTruthy();
    }

    vi.unstubAllGlobals();
  });

  it('includes YAML frontmatter in the markdown output', async () => {
    const html = loadFixtureHtml('article.html');
    const dom = setupDom(html);

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('chrome', {
      runtime: { onMessage: { addListener: vi.fn() } },
    });

    const { handleExtractPage } = await import('../../src/content/index');
    const result = await handleExtractPage();

    expect(result.type).toBe(MESSAGE_TYPES.EXTRACTION_RESULT);
    if (result.type === MESSAGE_TYPES.EXTRACTION_RESULT) {
      const md = result.data.markdown;
      expect(md.startsWith('---\n')).toBe(true);
      expect(md).toContain('url: "https://example.com/test-article"');
      expect(md).toContain('date:');
      expect(md).toContain('word_count:');
    }

    vi.unstubAllGlobals();
  });

  it('handles semantic-only pages via fallback', async () => {
    const html = loadFixtureHtml('semantic-only.html');
    const dom = setupDom(html);

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('chrome', {
      runtime: { onMessage: { addListener: vi.fn() } },
    });

    const { handleExtractPage } = await import('../../src/content/index');
    const result = await handleExtractPage();

    expect(result.type).toBe(MESSAGE_TYPES.EXTRACTION_RESULT);
    if (result.type === MESSAGE_TYPES.EXTRACTION_RESULT) {
      expect(result.data.markdown).toContain('main content area');
    }

    vi.unstubAllGlobals();
  });
});

describe('init and duplicate injection guard', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('registers message listener on first init', async () => {
    const html = loadFixtureHtml('article.html');
    const dom = setupDom(html);
    const mockAddListener = vi.fn();

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('chrome', {
      runtime: { onMessage: { addListener: mockAddListener } },
    });

    await import('../../src/content/index');
    expect(mockAddListener).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('does not register listener twice on duplicate injection', async () => {
    const html = loadFixtureHtml('article.html');
    const dom = setupDom(html);
    const mockAddListener = vi.fn();

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('chrome', {
      runtime: { onMessage: { addListener: mockAddListener } },
    });

    const mod = await import('../../src/content/index');
    const count = mockAddListener.mock.calls.length;

    // Calling init again should be a no-op due to injection guard
    mod.init();
    expect(mockAddListener.mock.calls.length).toBe(count);

    vi.unstubAllGlobals();
  });
});

describe('message listener', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('responds to EXTRACT_PAGE messages', async () => {
    const html = loadFixtureHtml('article.html');
    const dom = setupDom(html);
    const mockAddListener = vi.fn();

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('chrome', {
      runtime: { onMessage: { addListener: mockAddListener } },
    });

    await import('../../src/content/index');
    const listener = mockAddListener.mock.calls[0][0];

    const sendResponse = vi.fn();
    const returnValue = listener(
      { type: MESSAGE_TYPES.EXTRACT_PAGE },
      {},
      sendResponse,
    );

    expect(returnValue).toBe(true);

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalled();
    });

    const response = sendResponse.mock.calls[0][0];
    expect(response.type).toBe(MESSAGE_TYPES.EXTRACTION_RESULT);

    vi.unstubAllGlobals();
  });

  it('ignores non-EXTRACT_PAGE messages', async () => {
    const html = loadFixtureHtml('article.html');
    const dom = setupDom(html);
    const mockAddListener = vi.fn();

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('chrome', {
      runtime: { onMessage: { addListener: mockAddListener } },
    });

    await import('../../src/content/index');
    const listener = mockAddListener.mock.calls[0][0];

    const sendResponse = vi.fn();
    const returnValue = listener(
      { type: 'UNKNOWN_TYPE' },
      {},
      sendResponse,
    );

    expect(returnValue).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
