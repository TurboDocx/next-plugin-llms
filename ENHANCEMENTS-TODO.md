# Enhancement Roadmap

This document outlines planned enhancements to integrate the best features from [next-llms-txt](https://github.com/bke-daniel/next-llms-txt) and comprehensive testing.

## Status Legend
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Complete

---

## Phase 1: Per-Page Markdown Endpoints 🔴

### Goal
Generate individual `.html.md` markdown files for each page, following the llmstxt.org specification.

### Features to Implement

#### 1.1 Per-Page Route Handlers
- [ ] Create `per-page-generator.ts` module
- [ ] Generate route handlers at `app/[...path]/[page].html.md/route.ts`
- [ ] Support dynamic routes (e.g., `[id].html.md`)
- [ ] Support catch-all routes (e.g., `[...slug].html.md`)
- [ ] Handle route groups (folders in parentheses)

**Example Output:**
```
app/
├── products/
│   └── turbodocx-templating/
│       ├── page.tsx
│       ├── layout.tsx
│       └── page.html.md/
│           └── route.ts
```

**Generated Route Handler:**
```typescript
export const dynamic = 'force-static';

export function GET() {
  const markdown = `# TurboDocx Templating

> Create powerful document templates

[Full content here...]
`;

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
```

#### 1.2 Static File Option
- [ ] Support generating static `.html.md` files in `public/`
- [ ] Create proper directory structure
- [ ] Handle URL path mapping

#### 1.3 Configuration
- [ ] Add `generatePerPageMarkdown` option
- [ ] Add `perPageOptions` configuration
- [ ] Add per-page inclusion/exclusion patterns

**New Options:**
```typescript
interface PluginOptions {
  /**
   * Generate per-page markdown endpoints (.html.md)
   * @default false
   */
  generatePerPageMarkdown?: boolean;

  /**
   * Per-page markdown options
   */
  perPageOptions?: {
    /**
     * Output as route handlers or static files
     * @default 'route-handler'
     */
    outputType?: 'route-handler' | 'static';

    /**
     * Include page metadata in markdown
     * @default true
     */
    includeMetadata?: boolean;

    /**
     * Patterns for pages to include
     */
    includePatterns?: string[];

    /**
     * Patterns for pages to exclude
     */
    excludePatterns?: string[];
  };
}
```

#### 1.4 Content Format
- [ ] Clean markdown output (no JSX artifacts)
- [ ] Proper heading hierarchy
- [ ] Include frontmatter with metadata (optional)
- [ ] Preserve code blocks and formatting

**Example Markdown Output:**
```markdown
---
title: TurboDocx Templating
description: Create powerful document templates
url: https://www.turbodocx.com/products/turbodocx-templating
---

# TurboDocx Templating

> Create powerful document templates with drag-and-drop variables, conditional logic, and AI-powered suggestions.

## Features

- Smart template builder
- Drag-and-drop interface
- Conditional logic
- AI-powered suggestions

## Getting Started

[Content continues...]
```

---

## Phase 2: Optional Section Support 🔴

### Goal
Support the llmstxt.org "Optional" section for lower-priority content.

### Features to Implement

#### 2.1 Optional Section in llms.txt
- [ ] Add `priority: 'standard' | 'optional'` to CustomSection
- [ ] Generate "Optional" H2 section at end of llms.txt
- [ ] Sort sections: standard first, optional last

**Generated llms.txt with Optional:**
```markdown
# TurboDocx

> AI-powered document automation

## Products
- [TurboDocx Templating](url): Main product

## Use Cases
- [IT Teams](url): Primary use case

## Optional
- [Advanced Features](url): For power users
- [Legacy Documentation](url): Older content
```

#### 2.2 Configuration
- [ ] Update `CustomSection` interface
- [ ] Add `optionalSources` to group entire content sources as optional
- [ ] Auto-detect low-priority content (e.g., old blog posts)

**New Options:**
```typescript
interface CustomSection {
  title: string;
  items: CustomSectionItem[];
  description?: string;
  priority?: 'standard' | 'optional';  // NEW
}

interface PluginOptions {
  /**
   * Content sources marked as optional (lower priority)
   */
  optionalSources?: ContentSource[];
}
```

---

## Phase 3: Per-Page Metadata Control 🔴

### Goal
Allow individual pages to export `llmstxt` metadata for granular control.

### Features to Implement

#### 3.1 llmstxt Export Support
- [ ] Create `llmstxt-metadata.ts` parser
- [ ] Detect and parse `export const llmstxt = {...}` in layout/page files
- [ ] Support both object and function exports
- [ ] Merge with extracted metadata

**Per-Page Export:**
```typescript
// app/products/turbodocx-templating/layout.tsx
export const llmstxt = {
  enabled: true,
  title: 'TurboDocx Templating for LLMs',
  description: 'Comprehensive guide to templating features',
  priority: 'high',
  sections: ['Products', 'Documentation'],
  keywords: ['templates', 'automation', 'documents'],
};
```

#### 3.2 Dynamic llmstxt Function
- [ ] Support function exports for dynamic metadata
- [ ] Pass context (route info, metadata, etc.)

```typescript
export const llmstxt = async (context) => {
  const data = await fetchSomeData();
  return {
    title: `${data.name} - TurboDocx`,
    description: data.summary,
  };
};
```

#### 3.3 Disable Pages
- [ ] Respect `llmstxt.enabled = false` to exclude pages
- [ ] Provide console logging for excluded pages

#### 3.4 Override Behavior
- [ ] Per-page config overrides plugin defaults
- [ ] Per-page config overrides section config
- [ ] Clear precedence order documented

---

## Phase 4: Runtime/Hybrid Generation 🔴

### Goal
Support on-demand generation for dynamic content sites.

### Features to Implement

#### 4.1 Generation Modes
- [ ] Build-time mode (current, default)
- [ ] Runtime mode (generate on request)
- [ ] Hybrid mode (build-time + runtime cache)

**Configuration:**
```typescript
interface PluginOptions {
  /**
   * Generation mode
   * @default 'build-time'
   */
  generationMode?: 'build-time' | 'runtime' | 'hybrid';

  /**
   * Cache duration for runtime/hybrid modes (seconds)
   * @default 3600
   */
  runtimeCacheDuration?: number;

  /**
   * Regenerate on content changes (hybrid mode)
   * @default true
   */
  autoRegenerate?: boolean;
}
```

#### 4.2 Runtime Generator
- [ ] Create `runtime-generator.ts` module
- [ ] Implement in-memory caching
- [ ] Support cache invalidation
- [ ] Add cache warming on startup

**Generated Route Handler (Runtime):**
```typescript
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  // Runtime generation logic
  const routes = await discoverRoutes();
  const content = await generateLLMsTxt(routes);

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
```

#### 4.3 Hybrid Mode
- [ ] Generate base files at build time
- [ ] Regenerate on first request after cache expires
- [ ] Merge build-time + runtime content sources
- [ ] Performance monitoring/logging

#### 4.4 Cache Management
- [ ] Manual cache invalidation API
- [ ] Webhook support for content updates
- [ ] File-watch based regeneration (dev mode)

---

## Phase 5: Sitemap Auto-Discovery 🔴

### Goal
Discover pages from sitemap.xml instead of (or in addition to) file system scanning.

### Features to Implement

#### 5.1 Sitemap Parser
- [ ] Create `sitemap-parser.ts` module
- [ ] Parse XML sitemap files
- [ ] Support sitemap index files
- [ ] Handle sitemap.ts route handlers

**Configuration:**
```typescript
interface PluginOptions {
  /**
   * Auto-discovery configuration
   */
  autoDiscovery?: {
    /**
     * Discovery source
     * @default 'filesystem'
     */
    source?: 'filesystem' | 'sitemap' | 'both';

    /**
     * Path to sitemap (file or URL)
     * @default 'public/sitemap.xml' or '/sitemap.xml'
     */
    sitemapPath?: string;

    /**
     * Follow sitemap index files
     * @default true
     */
    followSitemapIndex?: boolean;
  };
}
```

#### 5.2 URL to Route Mapping
- [ ] Map sitemap URLs back to file paths
- [ ] Handle dynamic routes
- [ ] Match against Next.js routing conventions

#### 5.3 Hybrid Discovery
- [ ] Combine filesystem + sitemap
- [ ] Deduplicate routes
- [ ] Prefer sitemap URLs for external linking

---

## Phase 6: Comprehensive Test Suite 🔴

### Goal
Achieve 80%+ test coverage with unit, integration, and snapshot tests.

### 6.1 Unit Tests

#### scanner.test.ts
- [ ] Test file system scanning
- [ ] Test route group handling (parentheses folders)
- [ ] Test dynamic route detection `[id]`
- [ ] Test catch-all routes `[...slug]`
- [ ] Test exclusion patterns
- [ ] Test section grouping
- [ ] Test priority sorting

#### metadata-extractor.test.ts
- [ ] Test layout.tsx metadata extraction
- [ ] Test fallback to default metadata
- [ ] Test OpenGraph extraction
- [ ] Test title templates
- [ ] Test `llmstxt` export parsing
- [ ] Test getBestTitle() logic
- [ ] Test getBestDescription() logic

#### content-processor.test.ts
- [ ] Test JSX stripping
- [ ] Test string literal extraction
- [ ] Test template literal extraction
- [ ] Test heading detection (h1-h6)
- [ ] Test content truncation
- [ ] Test fallback content extraction
- [ ] Test special characters handling

#### generator.test.ts
- [ ] Test llms.txt format generation
- [ ] Test llms-full.txt format generation
- [ ] Test section organization
- [ ] Test Optional section generation
- [ ] Test custom sections
- [ ] Test URL building
- [ ] Test route handler file generation

#### per-page-generator.test.ts
- [ ] Test per-page route handler creation
- [ ] Test markdown formatting
- [ ] Test frontmatter generation
- [ ] Test path mapping
- [ ] Test static file generation

#### runtime-generator.test.ts
- [ ] Test runtime generation
- [ ] Test caching behavior
- [ ] Test cache invalidation
- [ ] Test hybrid mode

### 6.2 Integration Tests

#### fixtures/basic-app/
Simple Next.js app with:
- [ ] Home page
- [ ] About page
- [ ] Contact page

#### fixtures/complex-app/
Complex Next.js app with:
- [ ] Multiple sections (products, blog, use cases)
- [ ] Dynamic routes
- [ ] Nested routes
- [ ] Route groups
- [ ] Custom metadata

#### fixtures/dynamic-app/
App with dynamic routes:
- [ ] `[id]` routes
- [ ] `[...slug]` catch-all routes
- [ ] Optional catch-all `[[...slug]]`

#### Test Scenarios
- [ ] Test zero-config usage
- [ ] Test with custom configuration
- [ ] Test with content sources
- [ ] Test with custom sections
- [ ] Test per-page markdown generation
- [ ] Test runtime mode
- [ ] Test sitemap discovery
- [ ] Test error handling

### 6.3 Snapshot Tests
- [ ] Snapshot llms.txt output format
- [ ] Snapshot llms-full.txt output format
- [ ] Snapshot per-page markdown format
- [ ] Snapshot route handler code
- [ ] Update snapshots on spec changes

### 6.4 Test Infrastructure

#### Setup
- [ ] Install vitest
- [ ] Configure vitest.config.ts
- [ ] Set up test utilities
- [ ] Create mock file system (memfs)
- [ ] Create test fixtures

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.ts',
        '**/*.d.ts',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});
```

#### Scripts
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run test/unit",
    "test:integration": "vitest run test/integration"
  }
}
```

### 6.5 CI/CD Integration
- [ ] Create GitHub Actions workflow
- [ ] Run tests on PR
- [ ] Run tests on push to main
- [ ] Generate coverage reports
- [ ] Block merge if coverage drops

**.github/workflows/test.yml:**
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
```

---

## Phase 7: Documentation & Examples 🔴

### 7.1 Enhanced README

#### Add Sections
- [ ] Per-page markdown endpoints usage
- [ ] Runtime vs build-time comparison
- [ ] llmstxt export examples
- [ ] Migration guide from next-llms-txt
- [ ] Troubleshooting guide
- [ ] Performance tips
- [ ] Best practices

### 7.2 API Documentation
- [ ] Set up TypeDoc
- [ ] Generate API docs
- [ ] Host on GitHub Pages
- [ ] Add examples to each interface

**Script:**
```json
{
  "scripts": {
    "docs:generate": "typedoc src/index.ts",
    "docs:serve": "npx serve docs"
  }
}
```

### 7.3 Example Projects

#### examples/basic/
- [ ] Zero-config setup
- [ ] Minimal Next.js app
- [ ] README with instructions

#### examples/advanced/
- [ ] Full configuration
- [ ] Multiple content sources
- [ ] Custom sections
- [ ] Per-page metadata

#### examples/per-page/
- [ ] Per-page markdown endpoints
- [ ] Static file generation
- [ ] Markdown frontmatter

#### examples/runtime/
- [ ] Runtime generation mode
- [ ] Cache configuration
- [ ] Dynamic content

#### examples/hybrid/
- [ ] Hybrid mode setup
- [ ] Cache warming
- [ ] Performance monitoring

#### examples/ecommerce/
- [ ] Product catalog
- [ ] Category pages
- [ ] Dynamic product pages

#### examples/blog/
- [ ] Blog post listing
- [ ] Individual posts
- [ ] Tag/category pages
- [ ] Pagination

#### examples/docs-site/
- [ ] Documentation structure
- [ ] API reference
- [ ] Guides and tutorials
- [ ] Search integration

### 7.4 Migration Guides

#### From Manual Implementation
- [ ] Step-by-step migration
- [ ] Configuration mapping
- [ ] Testing checklist
- [ ] Rollback plan

#### From next-llms-txt
- [ ] Feature comparison table
- [ ] Configuration migration
- [ ] Code examples side-by-side
- [ ] Breaking changes

### 7.5 Contributing Guide
- [ ] CONTRIBUTING.md
- [ ] Development setup
- [ ] Testing requirements
- [ ] PR guidelines
- [ ] Code style guide

---

## Feature Comparison Matrix

After all enhancements are complete:

| Feature | next-llms-txt | @turbodocx/next-plugin-llms |
|---------|--------------|------------------------------|
| **Core** | | |
| llms.txt | ✅ | ✅ |
| llms-full.txt | ✅ | ✅ |
| Per-page .html.md | ✅ | ✅ (Phase 1) |
| Optional section | ❌ | ✅ (Phase 2) |
| **Generation** | | |
| Build-time | ❌ | ✅ (Current) |
| Runtime | ✅ | ✅ (Phase 4) |
| Hybrid | ❌ | ✅ (Phase 4) |
| **Discovery** | | |
| File system scan | ❌ | ✅ (Current) |
| HTTP auto-discovery | ✅ | ❌ |
| Sitemap | ❌ | ✅ (Phase 5) |
| **Customization** | | |
| Section grouping | ✅ | ✅ (Current) |
| Priority ordering | ❌ | ✅ (Current) |
| Custom sections | ✅ | ✅ (Current) |
| Per-page control | ✅ (llmstxt export) | ✅ (Phase 3) |
| Custom files | ❌ | ✅ (Current) |
| **Integration** | | |
| Config wrapper | ❌ | ✅ (Current) |
| Route handlers | ✅ | ✅ (Current) |
| Static files | ❌ | ✅ (Current) |
| Webpack plugin | ❌ | ✅ (Current) |
| **Testing** | | |
| Unit tests | ? | ✅ (Phase 6) |
| Integration tests | ? | ✅ (Phase 6) |
| Coverage > 80% | ? | ✅ (Phase 6) |

---

## Timeline Estimates

- **Phase 1**: 1 week
- **Phase 2**: 2-3 days
- **Phase 3**: 3-4 days
- **Phase 4**: 1 week
- **Phase 5**: 3-4 days
- **Phase 6**: 1-2 weeks
- **Phase 7**: 1 week

**Total: ~6-7 weeks**

---

## Priority Order

1. **Phase 6** (Testing) - Start immediately alongside existing features
2. **Phase 1** (Per-page markdown) - Most requested feature
3. **Phase 2** (Optional section) - Quick win, improves standard compliance
4. **Phase 3** (Per-page metadata) - Enables granular control
5. **Phase 7** (Documentation) - Essential for adoption
6. **Phase 4** (Runtime mode) - For dynamic content use cases
7. **Phase 5** (Sitemap discovery) - Nice-to-have

---

## Next Steps

1. ✅ Create this TODO document
2. 🟡 Test current implementation on dotcom
3. 🔴 Start Phase 6 (write tests for existing code)
4. 🔴 Implement Phase 1 (per-page endpoints)
5. 🔴 Continue through phases in priority order

---

## Questions & Decisions

### Open Questions
- [ ] Should we support HTTP auto-discovery like next-llms-txt or stick with sitemap?
- [ ] What's the priority on runtime mode? (TurboDocx is mostly static)
- [ ] Should per-page .html.md be enabled by default or opt-in?
- [ ] Do we need middleware for .html.md proxy (like next-llms-txt)?

### Design Decisions
- [x] Build-time generation as default (better performance)
- [x] Zero-config should work out of box
- [x] All new features are opt-in (no breaking changes)
- [x] TypeScript-first with comprehensive types
- [ ] Runtime mode added as option (not default)
- [ ] Per-page endpoints opt-in (generatePerPageMarkdown: true)

---

## Resources

- [llmstxt.org Specification](https://llmstxt.org/)
- [next-llms-txt Repository](https://github.com/bke-daniel/next-llms-txt)
- [docusaurus-plugin-llms](https://github.com/rachfop/docusaurus-plugin-llms)
- [vitepress-plugin-llms](https://github.com/okineadev/vitepress-plugin-llms)
