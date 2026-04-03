# Web to Markdown — Chrome Extension

## Project Overview
Chrome extension (Manifest V3) that converts the current webpage into LLM-friendly Markdown format with one click.

## Tech Stack
- **Language**: TypeScript (strict mode)
- **Build**: Vite + @crxjs/vite-plugin
- **Test**: Vitest + jsdom
- **Lint**: ESLint + Prettier
- **Runtime Libraries**: @mozilla/readability, turndown, turndown-plugin-gfm
- **UI**: Vanilla HTML/CSS/TypeScript (no framework)

## Architecture
- **Manifest V3** with programmatic content script injection
- **Popup** → direct communication with Content Script (no service worker relay)
- **Service Worker**: minimal, reserved for future extensions (keyboard shortcuts, context menu)
- **3-tier fallback extraction**: Readability.js → semantic selectors → body.innerText

## Project Structure
```
src/
├── popup/          # Extension popup UI
├── content/        # Content script (extraction + conversion)
├── background/     # Minimal service worker
├── shared/         # Types, constants
└── assets/icons/   # Extension icons
tests/
├── unit/           # Vitest unit tests
└── fixtures/       # HTML test fixtures
```

## Key Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server with HMR
npm run build        # Production build
npm run test         # Run unit tests
npm run lint         # Lint check
```

## Permissions
- `activeTab` — access current tab on user click only
- `scripting` — required for chrome.scripting.executeScript
- `clipboardWrite` — copy to clipboard

## Design Decisions
- On-demand script injection (not declarative content scripts) for least-privilege
- YAML frontmatter in output for structured LLM metadata
- 200K character limit for LLM context window friendliness
- MutationObserver + retry for SPA/dynamic content handling

## Code Conventions
- Feature-based file organization (popup/, content/, background/)
- Single responsibility per file, < 200 lines
- Immutable data patterns
- Typed message protocol (shared/types.ts)
- No inline styles, no eval, no remote code (MV3 CSP)

## Git
- Remote: git@github.com:chenjie222/chrome-plugins.git
- Branch: main
- Conventional commits: feat/fix/refactor/docs/test/chore
