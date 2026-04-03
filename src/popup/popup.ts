import { MESSAGE_TYPES, COPIED_FEEDBACK_DURATION } from '../shared/constants';
import type { Message } from '../shared/types';
import { isExtractionResult, isExtractionError } from '../shared/types';
import {
  createPopupState,
  transition,
  generateFilename,
} from './popup-state';
import type { PopupModel, PopupAction } from './popup-state';

// --- DOM references ---

const stateIdle = document.getElementById('state-idle') as HTMLElement;
const stateExtracting = document.getElementById('state-extracting') as HTMLElement;
const stateSuccess = document.getElementById('state-success') as HTMLElement;
const stateError = document.getElementById('state-error') as HTMLElement;
const stateEmpty = document.getElementById('state-empty') as HTMLElement;

const btnExtract = document.getElementById('btn-extract') as HTMLButtonElement;
const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;
const btnRetryError = document.getElementById('btn-retry-error') as HTMLButtonElement;
const btnRetryEmpty = document.getElementById('btn-retry-empty') as HTMLButtonElement;
const preview = document.getElementById('preview') as HTMLPreElement;
const errorMessage = document.getElementById('error-message') as HTMLParagraphElement;

const metaTitle = document.getElementById('meta-title') as HTMLSpanElement;
const metaUrl = document.getElementById('meta-url') as HTMLSpanElement;
const metaWords = document.getElementById('meta-words') as HTMLSpanElement;
const metaTime = document.getElementById('meta-time') as HTMLSpanElement;

// --- State management ---

let currentState = createPopupState();
let copyTimeoutId: ReturnType<typeof setTimeout> | null = null;

function dispatch(action: PopupAction): void {
  currentState = transition(currentState, action);
  render(currentState);
}

function render(state: PopupModel): void {
  const sections = [stateIdle, stateExtracting, stateSuccess, stateError, stateEmpty];
  for (const section of sections) {
    section.classList.add('hidden');
  }

  switch (state.status) {
    case 'IDLE':
      stateIdle.classList.remove('hidden');
      break;

    case 'EXTRACTING':
      stateExtracting.classList.remove('hidden');
      break;

    case 'SUCCESS':
      stateSuccess.classList.remove('hidden');
      preview.textContent = state.markdown;
      btnCopy.textContent = 'Copy to Clipboard';
      btnCopy.classList.remove('copied');
      btnCopy.classList.remove('copy-failed');
      if (state.metadata) {
        metaTitle.textContent = state.metadata.title;
        metaTitle.title = state.metadata.title;
        metaUrl.textContent = state.metadata.url;
        metaUrl.title = state.metadata.url;
        metaWords.textContent = state.metadata.wordCount.toLocaleString();
        metaTime.textContent = String(state.metadata.readingTimeMinutes);
      }
      break;

    case 'COPIED':
      stateSuccess.classList.remove('hidden');
      btnCopy.textContent = 'Copied!';
      btnCopy.classList.add('copied');
      btnCopy.classList.remove('copy-failed');
      break;

    case 'ERROR':
      stateError.classList.remove('hidden');
      errorMessage.textContent = state.errorMessage;
      break;

    case 'EMPTY':
      stateEmpty.classList.remove('hidden');
      break;
  }
}

// --- Actions ---

async function init(): Promise<void> {
  dispatch({ type: 'START_EXTRACT' });

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      dispatch({
        type: 'RECEIVE_ERROR',
        error: {
          type: 'EXTRACTION_ERROR',
          error: { code: 'EXTRACTION_FAILED', message: 'No active tab found.' },
        },
      });
      return;
    }

    const response: Message = await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.EXTRACT_PAGE,
    });

    if (isExtractionResult(response)) {
      dispatch({ type: 'RECEIVE_RESULT', result: response });
    } else if (isExtractionError(response)) {
      dispatch({ type: 'RECEIVE_ERROR', error: response });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Extraction failed.';
    dispatch({
      type: 'RECEIVE_ERROR',
      error: {
        type: 'EXTRACTION_ERROR',
        error: { code: 'EXTRACTION_FAILED', message },
      },
    });
  }
}

async function handleCopy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(currentState.markdown);
    dispatch({ type: 'COPY' });

    if (copyTimeoutId !== null) {
      clearTimeout(copyTimeoutId);
    }
    copyTimeoutId = setTimeout(() => {
      dispatch({ type: 'COPY_TIMEOUT' });
      copyTimeoutId = null;
    }, COPIED_FEEDBACK_DURATION);
  } catch {
    btnCopy.textContent = 'Copy failed';
    btnCopy.classList.add('copy-failed');

    if (copyTimeoutId !== null) {
      clearTimeout(copyTimeoutId);
    }
    copyTimeoutId = setTimeout(() => {
      btnCopy.textContent = 'Copy to Clipboard';
      btnCopy.classList.remove('copy-failed');
      copyTimeoutId = null;
    }, COPIED_FEEDBACK_DURATION);
  }
}

function handleDownload(): void {
  const title = currentState.metadata?.title ?? '';
  const blob = new Blob([currentState.markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = generateFilename(title);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

// --- Event listeners ---

btnExtract.addEventListener('click', init);
btnCopy.addEventListener('click', handleCopy);
btnDownload.addEventListener('click', handleDownload);
btnRetryError.addEventListener('click', init);
btnRetryEmpty.addEventListener('click', init);

// --- Auto-extract on popup open ---

init();
