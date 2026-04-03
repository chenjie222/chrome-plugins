# Web to Markdown

[English](#english) | [中文](#中文)

---

<a id="english"></a>

## English

Chrome Extension (Manifest V3) that converts any webpage into LLM-friendly Markdown with one click.

### Features

- **One-click extraction** — click the extension icon, get Markdown instantly
- **Smart content extraction** — 3-tier fallback: Readability.js → semantic selectors → body text
- **Clean Markdown output** — headings, links, lists, code blocks, GFM tables
- **YAML frontmatter** — title, URL, date, word count metadata for LLM consumption
- **Copy to clipboard** — one click with visual feedback
- **Download as .md** — CJK-safe filenames
- **SPA support** — MutationObserver waits for dynamic content

### Quick Start

```bash
# Install dependencies
npm install

# Development (with HMR)
npm run dev

# Production build
npm run build

# Run tests
npm run test
```

#### Load in Chrome

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `dist/` folder
5. Navigate to any webpage → click the extension icon

### Output Format

```markdown
---
title: "Article Title"
url: "https://example.com/article"
date: 2026-04-03T11:10:00Z
word_count: 1234
---

# Article Title

Extracted content in clean Markdown...
```

### Tech Stack

- **TypeScript** (strict mode)
- **Vite** + @crxjs/vite-plugin
- **Readability.js** — Mozilla's content extraction engine
- **Turndown.js** + GFM plugin — HTML to Markdown
- **Vitest** — 77 unit tests

### Project Structure

```
src/
├── popup/          # Extension popup UI (HTML/CSS/TS)
├── content/        # Content script (extraction + conversion)
│   ├── extractor.ts    # 3-tier content extraction
│   ├── converter.ts    # HTML → Markdown + YAML frontmatter
│   └── index.ts        # Message handler entry point
├── background/     # Minimal service worker
└── shared/         # Types and constants
tests/
├── unit/           # 77 unit tests
└── fixtures/       # HTML test fixtures
```

### Permissions

| Permission | Why |
|-----------|-----|
| `activeTab` | Access current tab only when you click the icon |
| `scripting` | Inject content script on demand |
| `clipboardWrite` | Copy Markdown to clipboard |

No host permissions. No background data collection.

---

<a id="中文"></a>

## 中文

Chrome 浏览器扩展（Manifest V3），一键将任意网页转化为 LLM 友好的 Markdown 格式。

### 功能特性

- **一键提取** — 点击插件图标，立即获取 Markdown
- **智能内容提取** — 三层降级：Readability.js → 语义选择器 → body 文本
- **干净的 Markdown 输出** — 标题、链接、列表、代码块、GFM 表格
- **YAML 元数据** — 标题、URL、日期、字数，方便 LLM 解析
- **一键复制** — 复制到剪贴板，带视觉反馈
- **下载 .md 文件** — 支持中日韩文件名
- **SPA 支持** — MutationObserver 等待动态内容加载

### 快速开始

```bash
# 安装依赖
npm install

# 开发模式（支持热更新）
npm run dev

# 生产构建
npm run build

# 运行测试
npm run test
```

#### 在 Chrome 中加载

1. 运行 `npm run build`
2. 打开 `chrome://extensions`
3. 开启**开发者模式**
4. 点击**加载已解压的扩展程序** → 选择 `dist/` 目录
5. 访问任意网页 → 点击插件图标

### 输出格式

```markdown
---
title: "文章标题"
url: "https://example.com/article"
date: 2026-04-03T11:10:00Z
word_count: 1234
---

# 文章标题

提取的内容以干净的 Markdown 格式呈现...
```

### 技术栈

- **TypeScript**（严格模式）
- **Vite** + @crxjs/vite-plugin
- **Readability.js** — Mozilla 内容提取引擎
- **Turndown.js** + GFM 插件 — HTML 转 Markdown
- **Vitest** — 77 个单元测试

### 项目结构

```
src/
├── popup/          # 扩展弹窗 UI（HTML/CSS/TS）
├── content/        # 内容脚本（提取 + 转换）
│   ├── extractor.ts    # 三层内容提取
│   ├── converter.ts    # HTML → Markdown + YAML 元数据
│   └── index.ts        # 消息处理入口
├── background/     # 最小化 Service Worker
└── shared/         # 类型定义和常量
tests/
├── unit/           # 77 个单元测试
└── fixtures/       # HTML 测试数据
```

### 权限说明

| 权限 | 用途 |
|------|------|
| `activeTab` | 仅在点击图标时访问当前标签页 |
| `scripting` | 按需注入内容脚本 |
| `clipboardWrite` | 复制到剪贴板 |

无需主机权限，不收集任何后台数据。

---

## License

[MIT](LICENSE)
