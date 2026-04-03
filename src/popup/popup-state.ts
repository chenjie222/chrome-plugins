import type { PopupState, ExtractionResult, ExtractionError, Metadata } from '../shared/types';

export interface PopupModel {
  readonly status: PopupState;
  readonly markdown: string;
  readonly metadata: Metadata | null;
  readonly errorMessage: string;
}

export type PopupAction =
  | { readonly type: 'START_EXTRACT' }
  | { readonly type: 'RECEIVE_RESULT'; readonly result: ExtractionResult }
  | { readonly type: 'RECEIVE_ERROR'; readonly error: ExtractionError }
  | { readonly type: 'COPY' }
  | { readonly type: 'COPY_TIMEOUT' }
  | { readonly type: 'RESET' };

export function createPopupState(): PopupModel {
  return {
    status: 'IDLE',
    markdown: '',
    metadata: null,
    errorMessage: '',
  };
}

export function transition(state: PopupModel, action: PopupAction): PopupModel {
  switch (action.type) {
    case 'START_EXTRACT':
      return { ...state, status: 'EXTRACTING', errorMessage: '' };

    case 'RECEIVE_RESULT':
      return {
        ...state,
        status: 'SUCCESS',
        markdown: action.result.data.markdown,
        metadata: action.result.data.metadata,
      };

    case 'RECEIVE_ERROR':
      return {
        ...state,
        status: action.error.error.code === 'NO_CONTENT' ? 'EMPTY' : 'ERROR',
        errorMessage: action.error.error.message,
      };

    case 'COPY':
      return { ...state, status: 'COPIED' };

    case 'COPY_TIMEOUT':
      return { ...state, status: 'SUCCESS' };

    case 'RESET':
      return createPopupState();

    default:
      return state;
  }
}

export function generateFilename(title: string): string {
  const slug = title
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);

  return `${slug || 'page'}.md`;
}
