import { Readability } from '@mozilla/readability';
import type { Metadata } from '../shared/types';
import {
  MAX_CONTENT_LENGTH,
  MIN_CONTENT_LENGTH,
  MUTATION_OBSERVER_TIMEOUT,
  TRUNCATION_NOTICE,
  READING_SPEED_WPM,
  SEMANTIC_SELECTORS,
  NOISE_SELECTORS,
} from '../shared/constants';

export interface ExtractionOutput {
  readonly html: string;
  readonly title: string;
  readonly textContent: string;
}

export function extractWithReadability(doc: Document): ExtractionOutput | null {
  const clone = doc.cloneNode(true) as Document;
  const reader = new Readability(clone);
  const result = reader.parse();
  if (!result || !result.content.trim()) {
    return null;
  }
  return {
    html: result.content,
    title: result.title,
    textContent: result.textContent,
  };
}

export function extractWithSemanticSelectors(doc: Document): ExtractionOutput | null {
  for (const selector of SEMANTIC_SELECTORS) {
    const el = doc.querySelector(selector);
    if (el && el.textContent && el.textContent.trim().length >= MIN_CONTENT_LENGTH) {
      return {
        html: el.innerHTML,
        title: doc.title,
        textContent: el.textContent,
      };
    }
  }
  return null;
}

export function extractWithBodyFallback(doc: Document): ExtractionOutput | null {
  const clone = doc.body.cloneNode(true) as HTMLElement;
  for (const selector of NOISE_SELECTORS) {
    const noiseElements = clone.querySelectorAll(selector);
    noiseElements.forEach((el) => el.remove());
  }
  const text = clone.textContent?.trim() ?? '';
  if (!text) {
    return null;
  }
  return {
    html: clone.innerHTML,
    title: doc.title,
    textContent: text,
  };
}

export function extractContent(doc: Document): ExtractionOutput | null {
  return (
    extractWithReadability(doc) ??
    extractWithSemanticSelectors(doc) ??
    extractWithBodyFallback(doc)
  );
}

export function truncateContent(text: string): string {
  if (text.length <= MAX_CONTENT_LENGTH) {
    return text;
  }
  return text.slice(0, MAX_CONTENT_LENGTH) + TRUNCATION_NOTICE;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  const cjkChars = trimmed.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g);
  const cjkCount = cjkChars ? cjkChars.length : 0;
  const withoutCjk = trimmed.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ');
  const latinWords = withoutCjk.split(/\s+/).filter((w) => w.length > 0);
  return cjkCount + latinWords.length;
}

export function buildMetadata(title: string, url: string, textContent: string): Metadata {
  const wordCount = countWords(textContent);
  return {
    title,
    url,
    extractedAt: new Date().toISOString(),
    wordCount,
    readingTimeMinutes: Math.max(1, Math.ceil(wordCount / READING_SPEED_WPM)),
  };
}

export function waitForContent(doc: Document): Promise<void> {
  const text = doc.body?.textContent?.trim() ?? '';
  if (text.length >= MIN_CONTENT_LENGTH) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let resolved = false;

    const done = (): void => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve();
    };

    const observer = new MutationObserver(() => {
      const currentText = doc.body?.textContent?.trim() ?? '';
      if (currentText.length >= MIN_CONTENT_LENGTH) {
        done();
      }
    });

    observer.observe(doc.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const timer = setTimeout(done, MUTATION_OBSERVER_TIMEOUT);
  });
}
