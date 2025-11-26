![TurboDocx Banner](./banner.png)

# @turbodocx/next-plugin-llms

A Next.js plugin for automatically generating LLM-friendly documentation following the [llmstxt.org](https://llmstxt.org/) standard.

## Features

- ⚡️ **Automatic Generation** - Scans your Next.js app directory and generates `llms.txt` and `llms-full.txt` files
- 📄 **Per-Page Endpoints** - Generate `.html.md` endpoints for each page (e.g., `/products.html.md`)
- 🎯 **Zero Config** - Works out of the box with sensible defaults
- 🔧 **Highly Customizable** - Fine-tune content sources, sections, and output format
- 📝 **Content Extraction** - Intelligently extracts readable text from React/TSX components
- 🏗️ **Build-Time Generation** - Runs during Next.js build for optimal performance
- 📊 **Section Grouping** - Organize content by products, use cases, blog posts, etc.
- 🎨 **Custom Sections** - Add external links, open source projects, and more
- 📦 **Multiple Output Modes** - Generate as route handlers or static files
- 🔀 **Dynamic Routes** - Supports `[id]` and `[...slug]` catch-all routes

## Installation

```bash
npm install @turbodocx/next-plugin-llms --save-dev
```

## Quick Start

### Basic Usage (Zero Config)

```typescript
// next.config.ts
import { withLLMsTxt } from '@turbodocx/next-plugin-llms';

export default withLLMsTxt({
  // Your Next.js config
  reactStrictMode: true,
});
```

That's it! The plugin will automatically:
- Scan your `app/` directory
- Extract metadata from `layout.tsx` files
- Extract content from `page.tsx` files
- Generate `app/llms.txt/route.ts` (directory/index)
- Generate `app/llms-full.txt/route.ts` (all content combined)
- Generate `app/**/*.html.md/route.ts` (per-page endpoints)

### Advanced Configuration

```typescript
// next.config.ts
import { withLLMsTxt } from '@turbodocx/next-plugin-llms';

export default withLLMsTxt({
  // Next.js config
  reactStrictMode: true,
}, {
  // Plugin options
  title: 'TurboDocx',
  description: 'AI-powered document automation platform',
  siteUrl: 'https://www.turbodocx.com',

  // Content sources with section grouping
  sources: [
    {
      section: 'Products',
      pattern: 'app/products/**',
      priority: 'high',
      description: 'Core product offerings'
    },
    {
      section: 'Use Cases',
      pattern: 'app/use-cases/**',
      priority: 'medium'
    },
    {
      section: 'Blog',
      pattern: 'app/blog/**',
      priority: 'medium'
    },
  ],

  // Custom sections (external links, open source, etc.)
  customSections: [
    {
      title: 'Open Source',
      description: 'Our open source contributions',
      items: [
        {
          title: '@turbodocx/html-to-docx',
          url: 'https://github.com/TurboDocx/html-to-docx',
          description: 'Convert HTML to DOCX - 26,000+ downloads'
        },
        {
          title: 'GitHub',
          url: 'https://github.com/TurboDocx'
        }
      ]
    },
    {
      title: 'Documentation',
      items: [
        {
          title: 'API Reference',
          url: 'https://docs.turbodocx.com/API'
        }
      ]
    }
  ],

  // Exclude specific routes
  excludePatterns: [
    '**/admin/**',
    '**/internal/**'
  ],

  // Content processing
  contentOptions: {
    stripJsx: true,
    preserveMarkdown: true,
    maxContentLength: 50000
  }
});
```

## Configuration Options

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable the plugin |
| `generateLLMsTxt` | `boolean` | `true` | Generate llms.txt file |
| `generateLLMsFullTxt` | `boolean` | `true` | Generate llms-full.txt file |
| `title` | `string` | - | Site title (falls back to Next.js metadata) |
| `description` | `string` | - | Site description |
| `siteUrl` | `string` | - | Base URL of your site |
| `appDir` | `string` | `'app'` | Path to app directory |
| `generatePerPageMarkdown` | `boolean` | `true` | Generate per-page `.html.md` endpoints |
| `perPageOptions` | `PerPageOptions` | - | Per-page generation options |

### Per-Page Markdown Endpoints

**Enabled by default!** Individual `.html.md` route handlers are generated for each page, allowing LLMs to fetch specific page content efficiently:

```typescript
{
  generatePerPageMarkdown: true,
  perPageOptions: {
    outputType: 'route-handler',     // 'route-handler' or 'static'
    includeMetadata: true,            // Include frontmatter metadata
    includePatterns: ['products/**', 'blog/**'],  // Only generate for these pages
    excludePatterns: ['**/admin/**']  // Exclude these pages
  }
}
```

**Generated Output:**
```
app/
├── products.html.md/
│   └── route.ts         → Serves markdown for /products
├── products/
│   └── shoes.html.md/
│       └── route.ts     → Serves markdown for /products/shoes
└── blog/
    └── [slug].html.md/
        └── route.ts     → Serves markdown for /blog/:slug
```

**Markdown Format:**
```markdown
---
title: Products
description: Our product catalog
url: https://example.com/products
---

# Products

> Our product catalog

Main page content here...
```

**PerPageOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputType` | `'route-handler' \| 'static'` | `'route-handler'` | Generate route handlers or static files |
| `includeMetadata` | `boolean` | `true` | Include frontmatter with metadata |
| `includePatterns` | `string[]` | `[]` | Only generate for matching pages |
| `excludePatterns` | `string[]` | `[]` | Exclude matching pages |

### Content Discovery

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includePatterns` | `string[]` | `['**/*.tsx', '**/*.ts']` | Files to include |
| `excludePatterns` | `string[]` | `['**/api/**', '**/_*.tsx']` | Files to exclude |
| `sources` | `ContentSource[]` | `[]` | Content sources with sections |

### Output Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputType` | `'route-handler' \| 'static'` | `'route-handler'` | Output format |
| `outputPath` | `object` | - | Custom output paths |

### Content Processing

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `contentOptions.stripJsx` | `boolean` | `true` | Strip JSX tags |
| `contentOptions.preserveMarkdown` | `boolean` | `true` | Preserve markdown formatting |
| `contentOptions.maxContentLength` | `number` | `50000` | Max content per page |

### Custom Files

Generate additional LLM files for specific sections:

```typescript
customFiles: [
  {
    filename: 'llms-products.txt',
    title: 'TurboDocx Products',
    description: 'Complete product documentation',
    includePatterns: ['app/products/**'],
    fullContent: true
  },
  {
    filename: 'llms-api.txt',
    title: 'Developer Documentation',
    description: 'API and integration guides',
    includePatterns: ['app/use-cases/developers/**'],
    fullContent: true
  }
]
```

## Content Sources

Content sources allow you to organize your documentation into logical sections:

```typescript
sources: [
  {
    section: 'Products',
    pattern: 'app/products/**',
    priority: 'high',           // high, medium, low
    description: 'Product pages'
  },
  {
    section: 'Use Cases',
    pattern: 'app/use-cases/**',
    priority: 'medium'
  }
]
```

**Priority levels:**
- `high`: Appears first in llms.txt
- `medium`: Appears in middle
- `low`: Appears last

## Custom Sections

Add external links or static content that isn't part of your Next.js app:

```typescript
customSections: [
  {
    title: 'External Resources',
    description: 'Additional documentation and tools',
    items: [
      {
        title: 'API Documentation',
        url: 'https://docs.example.com',
        description: 'Complete API reference'
      },
      {
        title: 'GitHub Repository',
        url: 'https://github.com/example/repo'
      }
    ]
  }
]
```

## Output Modes

### Route Handler (Default)

Generates Next.js route handlers:

```
app/
├── llms.txt/
│   └── route.ts
└── llms-full.txt/
    └── route.ts
```

Files are served at `/llms.txt` and `/llms-full.txt`.

### Static Files

Generates static text files:

```typescript
outputType: 'static'
```

```
public/
├── llms.txt
└── llms-full.txt
```

## How It Works

1. **Scan** - Recursively scans your `app/` directory for `page.tsx` files
2. **Extract Metadata** - Reads `layout.tsx` files to get titles, descriptions, and OpenGraph data
3. **Extract Content** - Parses React/TSX components to extract readable text
4. **Group** - Organizes routes by sections based on your configuration
5. **Generate** - Creates `llms.txt` and `llms-full.txt` files following the llmstxt.org standard

## Output Format

### llms.txt

```markdown
# TurboDocx

> AI-powered document automation platform

## Products

- [TurboDocx Templating](https://www.turbodocx.com/products/turbodocx-templating): Create templates with drag-and-drop
- [TurboDocx Writer](https://www.turbodocx.com/products/turbodocx-writer): AI-powered document creation
- [TurboSign](https://www.turbodocx.com/products/turbosign): Digital signatures at 50% lower cost

## Use Cases

- [IT Teams](https://www.turbodocx.com/use-cases/it-teams): Automate SOWs and technical docs
- [Sales Teams](https://www.turbodocx.com/use-cases/sales-teams): Generate proposals faster

## Open Source

- [@turbodocx/html-to-docx](https://github.com/TurboDocx/html-to-docx): Convert HTML to DOCX
```

### llms-full.txt

Includes complete content for each page with headings, descriptions, and full text.

## Manual Generation

You can also generate files manually:

```typescript
import { generateLLMFiles } from '@turbodocx/next-plugin-llms';

await generateLLMFiles({
  title: 'My Site',
  description: 'My documentation',
  appDir: 'app',
});
```

## Testing Locally

### Option 1: npm link

```bash
# In plugin directory
cd next-plugin-llms
npm install
npm run build
npm link

# In your Next.js project
npm link @turbodocx/next-plugin-llms
```

### Option 2: Local path

```json
// package.json
{
  "dependencies": {
    "@turbodocx/next-plugin-llms": "file:../next-plugin-llms"
  }
}
```

## Examples

See the [examples](./examples) directory for complete usage examples.

## Comparison to Alternatives

| Feature | Manual | Docusaurus Plugin | Next Plugin |
|---------|--------|-------------------|-------------|
| Auto-updates | ❌ | ✅ | ✅ |
| Next.js App Router | ⚠️ Manual | ❌ | ✅ |
| Custom sections | ⚠️ Manual | ✅ | ✅ |
| Build integration | ❌ | ✅ | ✅ |
| Content extraction | ❌ | ✅ Markdown | ✅ React/TSX |

## Requirements

- Node.js >= 18
- Next.js >= 14
- Next.js App Router (not Pages Router)

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

## Related Projects

- [docusaurus-plugin-llms](https://github.com/rachfop/docusaurus-plugin-llms) - LLM plugin for Docusaurus
- [vitepress-plugin-llms](https://github.com/okineadev/vitepress-plugin-llms) - LLM plugin for VitePress
- [llmstxt.org](https://llmstxt.org/) - Official llms.txt specification

## Credits

Built by [TurboDocx](https://www.turbodocx.com) - AI-powered document automation.
