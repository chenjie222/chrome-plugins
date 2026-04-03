import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { Metadata } from '../shared/types';

function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

export function createTurndownService(baseUrl: string): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  service.use(gfm);

  // Custom rule: code block language detection
  service.addRule('fencedCodeBlockWithLang', {
    filter(node) {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild !== null &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement(_content, node) {
      const codeEl = node.firstChild as HTMLElement;
      const code = codeEl.textContent ?? '';
      const className = codeEl.getAttribute('class') ?? '';
      const langMatch = className.match(/language-(\S+)/);
      const lang = langMatch ? langMatch[1] : '';
      return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    },
  });

  // Custom rule: relative URL to absolute URL for links
  service.addRule('absoluteLinks', {
    filter(node) {
      return (
        node.nodeName === 'A' &&
        node.getAttribute('href') !== null
      );
    },
    replacement(content, node) {
      if (!content.trim()) {
        return '';
      }
      const href = (node as HTMLElement).getAttribute('href') ?? '';
      const absoluteHref = resolveUrl(href, baseUrl);
      const title = (node as HTMLElement).getAttribute('title');
      if (title) {
        return `[${content}](${absoluteHref} "${title}")`;
      }
      return `[${content}](${absoluteHref})`;
    },
  });

  // Custom rule: relative URL to absolute URL for images
  service.addRule('absoluteImages', {
    filter: 'img',
    replacement(_content, node) {
      const src = (node as HTMLElement).getAttribute('src') ?? '';
      const alt = (node as HTMLElement).getAttribute('alt') ?? '';
      const absoluteSrc = resolveUrl(src, baseUrl);
      return `![${alt}](${absoluteSrc})`;
    },
  });

  return service;
}

export function convertToMarkdown(html: string, baseUrl: string): string {
  const service = createTurndownService(baseUrl);
  return service.turndown(html);
}

function escapeYamlTitle(title: string): string {
  const escaped = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export function prependFrontmatter(markdown: string, metadata: Metadata): string {
  const lines = [
    '---',
    `title: ${escapeYamlTitle(metadata.title)}`,
    `url: "${metadata.url}"`,
    `date: ${metadata.extractedAt}`,
    `word_count: ${metadata.wordCount}`,
    '---',
    '',
    markdown,
  ];
  return lines.join('\n');
}
