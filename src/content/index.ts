import type { ExtractionResult, ExtractionError, Message } from '../shared/types';
import { MESSAGE_TYPES } from '../shared/constants';
import { extractContent, truncateContent, buildMetadata, waitForContent } from './extractor';
import { convertToMarkdown, prependFrontmatter } from './converter';

const INJECTED_FLAG = '__WEB_TO_MARKDOWN_INJECTED__';

function isAlreadyInjected(): boolean {
  return (window as unknown as Record<string, unknown>)[INJECTED_FLAG] === true;
}

function markInjected(): void {
  (window as unknown as Record<string, unknown>)[INJECTED_FLAG] = true;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected error';
}

export async function handleExtractPage(): Promise<ExtractionResult | ExtractionError> {
  try {
    await waitForContent(document);

    const extraction = extractContent(document);
    if (!extraction) {
      return {
        type: MESSAGE_TYPES.EXTRACTION_ERROR,
        error: {
          code: 'NO_CONTENT',
          message: 'Could not extract any content from this page.',
        },
      };
    }

    const baseUrl = document.location.href;
    let markdown: string;
    try {
      markdown = convertToMarkdown(extraction.html, baseUrl);
    } catch (err: unknown) {
      return {
        type: MESSAGE_TYPES.EXTRACTION_ERROR,
        error: {
          code: 'CONVERSION_FAILED',
          message: `Markdown conversion failed: ${getErrorMessage(err)}`,
        },
      };
    }

    markdown = truncateContent(markdown);
    const metadata = buildMetadata(extraction.title, baseUrl, extraction.textContent);
    const fullMarkdown = prependFrontmatter(markdown, metadata);

    return {
      type: MESSAGE_TYPES.EXTRACTION_RESULT,
      data: {
        markdown: fullMarkdown,
        metadata,
      },
    };
  } catch (err: unknown) {
    return {
      type: MESSAGE_TYPES.EXTRACTION_ERROR,
      error: {
        code: 'EXTRACTION_FAILED',
        message: `Extraction failed: ${getErrorMessage(err)}`,
      },
    };
  }
}

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener(
    (message: Message, _sender, sendResponse: (response: ExtractionResult | ExtractionError) => void) => {
      if (message.type !== MESSAGE_TYPES.EXTRACT_PAGE) {
        return false;
      }

      handleExtractPage().then(sendResponse);

      // Return true to indicate async response
      return true;
    },
  );
}

export function init(): void {
  if (isAlreadyInjected()) {
    return;
  }
  markInjected();
  setupMessageListener();
}

init();
