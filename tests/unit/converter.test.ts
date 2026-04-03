import { describe, it, expect } from 'vitest';
import {
  createTurndownService,
  convertToMarkdown,
  prependFrontmatter,
} from '../../src/content/converter';
import type { Metadata } from '../../src/shared/types';

const BASE_URL = 'https://example.com';

describe('createTurndownService', () => {
  it('returns a TurndownService instance', () => {
    const service = createTurndownService(BASE_URL);
    expect(service).toBeDefined();
    expect(typeof service.turndown).toBe('function');
  });
});

describe('convertToMarkdown', () => {
  describe('headings', () => {
    it('converts h1 to # heading', () => {
      const result = convertToMarkdown('<h1>Title</h1>', BASE_URL);
      expect(result.trim()).toBe('# Title');
    });

    it('converts h2 to ## heading', () => {
      const result = convertToMarkdown('<h2>Subtitle</h2>', BASE_URL);
      expect(result.trim()).toBe('## Subtitle');
    });

    it('converts h3 through h6 to corresponding levels', () => {
      expect(convertToMarkdown('<h3>H3</h3>', BASE_URL).trim()).toBe('### H3');
      expect(convertToMarkdown('<h4>H4</h4>', BASE_URL).trim()).toBe('#### H4');
      expect(convertToMarkdown('<h5>H5</h5>', BASE_URL).trim()).toBe('##### H5');
      expect(convertToMarkdown('<h6>H6</h6>', BASE_URL).trim()).toBe('###### H6');
    });
  });

  describe('links', () => {
    it('converts relative URLs to absolute URLs', () => {
      const html = '<a href="/relative/path">Link Text</a>';
      const result = convertToMarkdown(html, BASE_URL);
      expect(result.trim()).toBe('[Link Text](https://example.com/relative/path)');
    });

    it('preserves absolute URLs', () => {
      const html = '<a href="https://other.com/page">External</a>';
      const result = convertToMarkdown(html, BASE_URL);
      expect(result.trim()).toBe('[External](https://other.com/page)');
    });

    it('skips empty links (no text content)', () => {
      const html = '<p>Before <a href="/empty"></a> After</p>';
      const result = convertToMarkdown(html, BASE_URL);
      expect(result).not.toContain('[');
      expect(result).not.toContain('](/');
    });
  });

  describe('lists', () => {
    it('converts unordered lists with dash markers', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = convertToMarkdown(html, BASE_URL);
      expect(result).toContain('-   Item 1');
      expect(result).toContain('-   Item 2');
    });

    it('converts ordered lists', () => {
      const html = '<ol><li>First</li><li>Second</li></ol>';
      const result = convertToMarkdown(html, BASE_URL);
      expect(result).toContain('1.');
      expect(result).toContain('First');
      expect(result).toContain('Second');
    });
  });

  describe('code blocks', () => {
    it('converts code blocks with language class', () => {
      const html = '<pre><code class="language-python">print("hello")</code></pre>';
      const result = convertToMarkdown(html, BASE_URL);
      expect(result).toContain('```python');
      expect(result).toContain('print("hello")');
      expect(result).toContain('```');
    });

    it('converts code blocks without language class', () => {
      const html = '<pre><code>plain code</code></pre>';
      const result = convertToMarkdown(html, BASE_URL);
      expect(result).toContain('```');
      expect(result).toContain('plain code');
    });
  });

  describe('tables (GFM)', () => {
    it('converts HTML tables to GFM tables', () => {
      const html = `
        <table>
          <thead><tr><th>Name</th><th>Age</th></tr></thead>
          <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
        </table>
      `;
      const result = convertToMarkdown(html, BASE_URL);
      expect(result).toContain('Name');
      expect(result).toContain('Age');
      expect(result).toContain('Alice');
      expect(result).toContain('30');
      expect(result).toContain('|');
      expect(result).toContain('---');
    });
  });

  describe('images', () => {
    it('converts images with relative src to absolute URLs', () => {
      const html = '<img src="/img.png" alt="desc">';
      const result = convertToMarkdown(html, BASE_URL);
      expect(result.trim()).toBe('![desc](https://example.com/img.png)');
    });

    it('preserves absolute image URLs', () => {
      const html = '<img src="https://cdn.example.com/photo.jpg" alt="photo">';
      const result = convertToMarkdown(html, BASE_URL);
      expect(result.trim()).toBe('![photo](https://cdn.example.com/photo.jpg)');
    });
  });
});

describe('prependFrontmatter', () => {
  const metadata: Metadata = {
    title: 'Test Page',
    url: 'https://example.com/page',
    extractedAt: '2026-04-03T11:10:00Z',
    wordCount: 1234,
    readingTimeMinutes: 6,
  };

  it('generates correct YAML frontmatter', () => {
    const result = prependFrontmatter('# Content', metadata);
    expect(result).toContain('---');
    expect(result).toContain('title: "Test Page"');
    expect(result).toContain('url: "https://example.com/page"');
    expect(result).toContain('date: 2026-04-03T11:10:00Z');
    expect(result).toContain('word_count: 1234');
    expect(result).toContain('# Content');
  });

  it('wraps frontmatter between --- delimiters', () => {
    const result = prependFrontmatter('body', metadata);
    const lines = result.split('\n');
    expect(lines[0]).toBe('---');
    const closingIndex = lines.indexOf('---', 1);
    expect(closingIndex).toBeGreaterThan(0);
  });

  it('escapes special characters in title with double quotes', () => {
    const specialMetadata: Metadata = {
      ...metadata,
      title: 'Title with "quotes" and: colons',
    };
    const result = prependFrontmatter('body', specialMetadata);
    expect(result).toContain('title: "Title with \\"quotes\\" and: colons"');
  });

  it('places markdown content after frontmatter with blank line', () => {
    const result = prependFrontmatter('# Hello', metadata);
    const parts = result.split('---');
    // parts[0] is empty (before first ---), parts[1] is frontmatter, rest is content
    const afterFrontmatter = parts.slice(2).join('---').trim();
    expect(afterFrontmatter).toBe('# Hello');
  });
});
