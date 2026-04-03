// --- Metadata ---

export interface Metadata {
  readonly title: string;
  readonly url: string;
  readonly extractedAt: string; // ISO 8601
  readonly wordCount: number;
  readonly readingTimeMinutes: number;
}

// --- Message Protocol ---

export interface ExtractRequest {
  readonly type: 'EXTRACT_PAGE';
}

export interface ExtractionResult {
  readonly type: 'EXTRACTION_RESULT';
  readonly data: {
    readonly markdown: string;
    readonly metadata: Metadata;
  };
}

export interface ExtractionError {
  readonly type: 'EXTRACTION_ERROR';
  readonly error: {
    readonly code: 'NO_CONTENT' | 'EXTRACTION_FAILED' | 'CONVERSION_FAILED';
    readonly message: string;
  };
}

export type Message = ExtractRequest | ExtractionResult | ExtractionError;

// --- Type Guards ---

export function isExtractionResult(msg: Message): msg is ExtractionResult {
  return msg.type === 'EXTRACTION_RESULT';
}

export function isExtractionError(msg: Message): msg is ExtractionError {
  return msg.type === 'EXTRACTION_ERROR';
}

// --- Popup State Machine ---

export type PopupState =
  | 'IDLE'
  | 'EXTRACTING'
  | 'SUCCESS'
  | 'ERROR'
  | 'EMPTY'
  | 'COPIED';
