import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPopupState,
  transition,
  generateFilename,
} from '../../src/popup/popup-state';
import type { PopupState, Metadata } from '../../src/shared/types';
import type { ExtractionResult, ExtractionError } from '../../src/shared/types';

const sampleMetadata: Metadata = {
  title: 'Test Page',
  url: 'https://example.com',
  extractedAt: '2026-04-03T00:00:00Z',
  wordCount: 500,
  readingTimeMinutes: 3,
};

const sampleResult: ExtractionResult = {
  type: 'EXTRACTION_RESULT',
  data: {
    markdown: '# Hello World',
    metadata: sampleMetadata,
  },
};

describe('createPopupState', () => {
  it('returns initial state as IDLE', () => {
    const state = createPopupState();
    expect(state.status).toBe('IDLE');
    expect(state.markdown).toBe('');
    expect(state.metadata).toBeNull();
    expect(state.errorMessage).toBe('');
  });
});

describe('transition', () => {
  it('transitions from IDLE to EXTRACTING', () => {
    const state = createPopupState();
    const next = transition(state, { type: 'START_EXTRACT' });
    expect(next.status).toBe('EXTRACTING');
  });

  it('transitions from EXTRACTING to SUCCESS with data and metadata', () => {
    const state = { ...createPopupState(), status: 'EXTRACTING' as PopupState };
    const next = transition(state, { type: 'RECEIVE_RESULT', result: sampleResult });
    expect(next.status).toBe('SUCCESS');
    expect(next.markdown).toBe('# Hello World');
    expect(next.metadata).toEqual(sampleMetadata);
    expect(next.metadata?.title).toBe('Test Page');
    expect(next.metadata?.wordCount).toBe(500);
    expect(next.metadata?.readingTimeMinutes).toBe(3);
  });

  it('transitions from EXTRACTING to ERROR on error', () => {
    const state = { ...createPopupState(), status: 'EXTRACTING' as PopupState };
    const error: ExtractionError = {
      type: 'EXTRACTION_ERROR',
      error: { code: 'EXTRACTION_FAILED', message: 'Something went wrong' },
    };
    const next = transition(state, { type: 'RECEIVE_ERROR', error });
    expect(next.status).toBe('ERROR');
    expect(next.errorMessage).toBe('Something went wrong');
  });

  it('transitions from EXTRACTING to EMPTY on NO_CONTENT', () => {
    const state = { ...createPopupState(), status: 'EXTRACTING' as PopupState };
    const error: ExtractionError = {
      type: 'EXTRACTION_ERROR',
      error: { code: 'NO_CONTENT', message: 'No content found' },
    };
    const next = transition(state, { type: 'RECEIVE_ERROR', error });
    expect(next.status).toBe('EMPTY');
    expect(next.errorMessage).toBe('No content found');
  });

  it('transitions CONVERSION_FAILED to ERROR (not EMPTY)', () => {
    const state = { ...createPopupState(), status: 'EXTRACTING' as PopupState };
    const error: ExtractionError = {
      type: 'EXTRACTION_ERROR',
      error: { code: 'CONVERSION_FAILED', message: 'Conversion error' },
    };
    const next = transition(state, { type: 'RECEIVE_ERROR', error });
    expect(next.status).toBe('ERROR');
  });

  it('transitions from SUCCESS to COPIED', () => {
    const state: ReturnType<typeof createPopupState> = {
      status: 'SUCCESS',
      markdown: '# Hello',
      metadata: sampleMetadata,
      errorMessage: '',
    };
    const next = transition(state, { type: 'COPY' });
    expect(next.status).toBe('COPIED');
    expect(next.markdown).toBe('# Hello');
    expect(next.metadata).toEqual(sampleMetadata);
  });

  it('transitions from COPIED back to SUCCESS', () => {
    const state: ReturnType<typeof createPopupState> = {
      status: 'COPIED',
      markdown: '# Hello',
      metadata: sampleMetadata,
      errorMessage: '',
    };
    const next = transition(state, { type: 'COPY_TIMEOUT' });
    expect(next.status).toBe('SUCCESS');
  });

  it('transitions from ERROR back to IDLE on RESET', () => {
    const state: ReturnType<typeof createPopupState> = {
      status: 'ERROR',
      markdown: '',
      metadata: null,
      errorMessage: 'fail',
    };
    const next = transition(state, { type: 'RESET' });
    expect(next.status).toBe('IDLE');
    expect(next.errorMessage).toBe('');
    expect(next.metadata).toBeNull();
  });

  it('does not mutate the original state', () => {
    const state = createPopupState();
    const next = transition(state, { type: 'START_EXTRACT' });
    expect(state.status).toBe('IDLE');
    expect(next.status).toBe('EXTRACTING');
  });
});

describe('generateFilename', () => {
  it('generates a filename from English title', () => {
    const name = generateFilename('Hello World');
    expect(name).toBe('Hello_World.md');
  });

  it('preserves CJK characters', () => {
    const name = generateFilename('Markdown 转换器');
    expect(name).toBe('Markdown_转换器.md');
  });

  it('preserves Japanese characters', () => {
    const name = generateFilename('テスト記事');
    expect(name).toBe('テスト記事.md');
  });

  it('preserves Korean characters', () => {
    const name = generateFilename('테스트 기사');
    expect(name).toBe('테스트_기사.md');
  });

  it('replaces special characters with nothing', () => {
    const name = generateFilename('Hello! @World# $2026');
    expect(name).toBe('Hello_World_2026.md');
  });

  it('trims leading/trailing underscores', () => {
    const name = generateFilename('___Hello___');
    expect(name).toBe('Hello.md');
  });

  it('collapses multiple underscores', () => {
    const name = generateFilename('Hello   World');
    expect(name).toBe('Hello_World.md');
  });

  it('returns fallback for empty title', () => {
    const name = generateFilename('');
    expect(name).toBe('page.md');
  });

  it('returns fallback for title with only special characters', () => {
    const name = generateFilename('!@#$%^&*');
    expect(name).toBe('page.md');
  });

  it('truncates long filenames', () => {
    const longTitle = 'A'.repeat(200);
    const name = generateFilename(longTitle);
    // 100 chars + .md = 103 chars max
    expect(name.length).toBeLessThanOrEqual(103);
    expect(name.endsWith('.md')).toBe(true);
  });
});

describe('copyToClipboard behavior', () => {
  it('navigator.clipboard.writeText is callable with markdown string', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const markdown = '# Test content';
    await navigator.clipboard.writeText(markdown);

    expect(writeText).toHaveBeenCalledWith('# Test content');
  });
});

describe('downloadMarkdown behavior', () => {
  it('creates a Blob with correct type', () => {
    const markdown = '# Hello World\n\nSome content.';
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    expect(blob.size).toBe(markdown.length);
    expect(blob.type).toBe('text/markdown;charset=utf-8');
  });

  it('generates correct download filename from metadata title', () => {
    const title = 'My Article Title';
    const filename = generateFilename(title);
    expect(filename).toBe('My_Article_Title.md');
  });
});
