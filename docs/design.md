# Web to Markdown — Chrome Extension 设计文档

> 日期：2026-04-03
> 状态：已确认，待实现
> 团队：architect-1, architect-2, reviewer, coder (team-dev-20260403-1110)

## 1. 项目概述

Chrome 插件：一键将当前网页转化为 LLM 可以理解的 Markdown 格式。

### 目标用户
需要将网页内容喂给 LLM（ChatGPT、Claude 等）的用户。

### 核心价值
- 一键操作，零配置
- 智能提取正文，过滤噪音（导航、广告、侧边栏）
- 输出 LLM 友好的 Markdown + YAML 元数据

## 2. 验收标准

| # | 功能点 | 验收条件 |
|---|--------|---------|
| AC-1 | 一键提取网页主要内容 | 点击插件按钮，自动提取当前页面正文，过滤导航栏/广告/侧边栏 |
| AC-2 | 转换为 Markdown 格式 | 输出包含标题、正文、链接、列表、代码块的 Markdown |
| AC-3 | 元数据保留 | 输出包含页面标题、URL、提取时间的 YAML frontmatter |
| AC-4 | 一键复制到剪贴板 | 点击复制按钮，Markdown 内容写入剪贴板并提示成功 |
| AC-5 | 下载为 .md 文件 | 可选下载为 Markdown 文件 |

### 不做
- 不做 LLM API 对接
- 不做多语言翻译
- 不做付费功能

## 3. 技术选型

### 3.1 内容提取：Readability.js

| 维度 | Readability.js | 自研 DOM 解析 | Mercury Parser |
|------|---------------|-------------|----------------|
| 成熟度 | Mozilla 维护，Firefox Reader View | 需大量测试 | 维护不活跃 |
| 准确度 | 优秀 | 不确定 | 良好但较重 |
| 体积 | ~70KB | 可变 | ~200KB+ |

**决策**：Readability.js。业界标准，Mozilla 持续维护。

### 3.2 HTML→Markdown：Turndown.js

| 维度 | Turndown.js | 自研 | Rehype |
|------|------------|------|--------|
| GFM 支持 | 插件（表格/删除线/任务列表） | 需自建 | 完整但重 |
| 体积 | ~30KB | 可变 | ~150KB+ |
| 扩展性 | 优秀的 addRule API | 完全控制 | AST |

**决策**：Turndown.js + turndown-plugin-gfm。

### 3.3 构建工具：Vite

- 快速 HMR 开发体验
- 自动处理 content script 和 popup 的打包
- Tree-shaking 减小体积
- TypeScript 原生支持

### 3.4 UI 框架：无

Popup 界面简单（预览区 + 2 按钮），React/Vue 增加 30-100KB 无收益。

## 4. 架构设计

### 4.1 Chrome Extension Manifest V3

关键约束：
- Service Worker 替代 background page（无 DOM）
- Content Script 在隔离环境运行，可访问页面 DOM
- CSP：禁止 eval、内联脚本、远程代码
- 库必须本地打包，不能 CDN 加载

### 4.2 数据流

```
用户点击插件图标
  → Popup 打开 (popup.html)
  → Popup 通过 chrome.scripting.executeScript 注入 content script
  → Content script：
      1. 克隆 DOM
      2. Readability.js 提取正文
      3. Turndown.js 转换为 Markdown
      4. 添加 YAML frontmatter 元数据
  → chrome.runtime.sendMessage 返回结果给 Popup
  → Popup 展示 Markdown 预览
  → 用户点击「复制」或「下载」
```

### 4.3 通信模型

**决策**：Popup 直接与 Content Script 通信，Service Worker 仅保留最小骨架。

理由（三人组会收敛）：
- Popup 拥有完整的 chrome.scripting API 权限
- Service Worker 中间层是多余的
- 保留 SW 骨架供未来扩展（如快捷键、右键菜单）

### 4.4 权限

```json
{
  "permissions": ["activeTab", "scripting", "clipboardWrite"]
}
```

| 权限 | 用途 |
|------|------|
| activeTab | 仅在用户点击时访问当前标签页 |
| scripting | chrome.scripting.executeScript 硬性要求 |
| clipboardWrite | navigator.clipboard.writeText |

不需要 host_permissions，Chrome Web Store 零警告。

### 4.5 消息协议

```typescript
interface ExtractRequest {
  type: 'EXTRACT_PAGE';
}

interface ExtractionResult {
  type: 'EXTRACTION_RESULT';
  data: {
    markdown: string;
    metadata: {
      title: string;
      url: string;
      extractedAt: string;
      wordCount: number;
      readingTimeMinutes: number;
    };
  };
}

interface ExtractionError {
  type: 'EXTRACTION_ERROR';
  error: {
    code: 'NO_CONTENT' | 'EXTRACTION_FAILED' | 'CONVERSION_FAILED';
    message: string;
  };
}
```

## 5. 项目结构

```
chrome-plugins/
├── manifest.json              # MV3 配置
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── popup/
│   │   ├── popup.html         # Popup 入口
│   │   ├── popup.ts           # UI 逻辑、复制、下载
│   │   └── popup.css          # 样式
│   ├── content/
│   │   ├── extractor.ts       # Readability 提取
│   │   ├── converter.ts       # Turndown 转换
│   │   └── index.ts           # Content script 入口
│   ├── background/
│   │   └── service-worker.ts  # 最小化 SW
│   ├── shared/
│   │   ├── types.ts           # TypeScript 接口
│   │   └── constants.ts       # 常量
│   └── assets/
│       └── icons/             # 16/32/48/128px
├── tests/
│   ├── unit/
│   │   ├── extractor.test.ts
│   │   ├── converter.test.ts
│   │   └── metadata.test.ts
│   └── fixtures/              # 测试用 HTML
└── README.md
```

## 6. Popup UI 设计

### 布局（420px × 540px）

```
┌─────────────────────────────────────┐
│  📄 Web to Markdown                 │  ← Header
├─────────────────────────────────────┤
│  Title: Article Title               │  ← 元数据栏
│  URL: https://example.com/...       │
│  Words: 1,234 | ~5 min read        │
├─────────────────────────────────────┤
│                                     │
│  ---                                │  ← Markdown 预览
│  title: "Article Title"             │     （可滚动，等宽字体）
│  url: https://...                   │
│  ---                                │
│                                     │
│  # Article Title                    │
│  Content here...                    │
│                                     │
├─────────────────────────────────────┤
│  [ Copy to Clipboard ]              │  ← 操作按钮
│  [ Download .md ]                   │
└─────────────────────────────────────┘
```

### 状态机

```
IDLE → EXTRACTING → SUCCESS → COPIED (2s 后回退)
                  → ERROR → IDLE (重试)
                  → EMPTY
```

## 7. 内容提取策略

### 3 层 Fallback Chain

1. **Readability.js**：主力提取，处理新闻/博客/文章
2. **语义选择器**：`<article>`、`<main>`、`[role="main"]` — Readability 失败时
3. **body.innerText**：最后兜底，带激进过滤（移除 script/style/nav/footer）

### SPA / 动态内容

- 先检查内容长度
- 不足 100 字符则启动 MutationObserver 等待 DOM 变化
- 2s 超时兜底
- 超时后仍内容不足，使用当前可用内容

### 大小限制

- **200K 字符**上限（约 5 万中文字 / 4 万英文词）
- 超出则截断，末尾添加 `\n\n---\n*Content truncated at 200,000 characters*`

### 边界情况

| 场景 | 处理 |
|------|------|
| iframe（同源） | 合并 contentDocument |
| iframe（跨域） | 跳过，安全限制 |
| 付费墙 | 提取可见内容，显示警告 |
| 非文章页 | Fallback chain 处理 |
| 代码块 | 保留 language- 类名 |
| 表格 | GFM 插件转换 |
| 图片 | `![alt](绝对URL)` |
| chrome:// 等特殊页 | 显示错误提示 |

## 8. 输出格式

```markdown
---
title: "Page Title"
url: https://example.com/article
date: 2026-04-03T11:10:00Z
word_count: 1234
---

# Page Title

[Markdown content here...]
```

YAML frontmatter 为 LLM 提供结构化元数据。

## 9. Turndown 自定义规则

- **代码块语言检测**：从 `class="language-*"` 提取语言标签
- **绝对 URL**：相对链接转绝对路径
- **跳过空链接**：移除无文本的 `<a>` 标签
- **GFM 插件**：表格、删除线、任务列表

## 10. 性能目标

| 指标 | 目标 |
|------|------|
| Popup 加载 | < 200ms |
| 内容提取+转换 | < 1s（典型文章） |
| 总 Bundle 大小 | < 150KB |
| 内存占用 | < 50MB |

### Bundle 预算

| 组件 | 预估大小 |
|------|---------|
| Readability.js | ~70KB |
| Turndown.js + GFM | ~35KB |
| Popup | ~15KB |
| Content script 逻辑 | ~10KB |
| Service worker | ~2KB |
| **合计** | **~132KB** |

## 11. 依赖

**运行时：**
- `@mozilla/readability` ^0.5.x
- `turndown` ^7.x
- `turndown-plugin-gfm` ^1.x

**开发：**
- typescript, vite, @crxjs/vite-plugin
- @types/chrome
- vitest (单元测试)
- eslint, prettier

## 12. 测试策略

| 层级 | 工具 | 覆盖目标 |
|------|------|---------|
| 单元：extractor | Vitest + jsdom | 90% |
| 单元：converter | Vitest | 90% |
| 单元：metadata | Vitest | 100% |
| 集成：消息流 | Vitest + chrome mock | 80% |

---

## 附录 A：设计过程记录

### 双路独立设计

两位 Architect 独立完成方案设计，互不可见对方方案，确保多元视角。

### 三人组会讨论

Architect-1、Architect-2 和 Reviewer 三人对比讨论，收敛分歧：

| 分歧点 | Architect-1 | Architect-2 | 最终决策 |
|--------|------------|------------|---------|
| 通信模型 | SW 中间层协调 | Popup 直接通信 | **直接通信**（三方一致） |
| scripting 权限 | 明确声明 | 遗漏 | **必须声明**（MV3 硬性要求） |
| SPA 处理 | 固定延迟+重试 | MutationObserver | **MutationObserver + 内容检查重试**（合并） |
| 大小限制 | 100K chars | 500KB | **200K chars**（折中，LLM 友好） |
| Fallback | 2 层 | 3 层 | **3 层**（成本极低，提升覆盖面） |
| UI 状态 | 5 种状态 | 状态机 | **合并状态机**（IDLE/EXTRACTING/SUCCESS/ERROR/EMPTY + COPIED 子状态） |
| 元数据格式 | 对象内嵌 | YAML frontmatter | **YAML frontmatter**（LLM 更友好） |

### 共识度评估：92%

| 维度 | 得分 |
|------|------|
| 发现一致性 | 95%（核心选型完全一致） |
| 互补性 | 95%（3层fallback、MutationObserver 互补） |
| 分歧程度 | 90%（仅实现细节差异，无方向性分歧） |
| 严重度一致性 | 90% |
| 覆盖完整性 | 90% |

### 架构决策记录

- **ADR-001**：按需注入 > 声明式 content script（窄权限、低开销）
- **ADR-002**：无 UI 框架（简单 popup 不值得引入 React/Vue）
- **ADR-003**：Readability.js + Turndown.js > 自研方案（久经考验、维护活跃）
- **ADR-004**：直接通信 > SW 中继（Popup 有完整 API 权限，中间层多余）
- **ADR-005**：YAML frontmatter > JSON 元数据（LLM 解析更自然）
