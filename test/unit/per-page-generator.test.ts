/**
 * Tests for per-page markdown generator
 * Following TDD approach - these tests are written BEFORE implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';
import * as fs from 'fs';
import type { RouteInfo, PluginOptions } from '../../src/types';
import {
  generatePerPageRoutes,
  createMarkdownContent,
  createRouteHandlerContent,
  getRouteHandlerPath,
} from '../../src/per-page-generator';

// Mock fs module
vi.mock('fs', () => {
  return {
    ...require('memfs').fs,
    default: require('memfs').fs
  };
});

vi.mock('fs/promises', () => {
  return require('memfs').fs.promises;
});

describe('Per-Page Generator', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vol.reset();
  });

  describe('generatePerPageRoutes', () => {
    it('should generate route handlers for all pages', async () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/test-app/app/products/page.tsx',
          urlPath: '/products',
          type: 'page',
          metadata: {
            title: 'Products',
            description: 'Our product catalog',
          },
          content: 'Welcome to our products page.',
        },
        {
          filePath: '/test-app/app/about/page.tsx',
          urlPath: '/about',
          type: 'page',
          metadata: {
            title: 'About Us',
            description: 'Learn about our company',
          },
          content: 'About our company.',
        },
      ];

      const options: PluginOptions = {
        appDir: '/test-app/app',
        generatePerPageMarkdown: true,
      };

      const result = await generatePerPageRoutes(routes, options);

      expect(result).toHaveLength(2);
      expect(result[0].path).toContain('products.html.md');
      expect(result[1].path).toContain('about.html.md');

      // Verify files were created
      expect(fs.existsSync('/test-app/app/products.html.md/route.ts')).toBe(true);
      expect(fs.existsSync('/test-app/app/about.html.md/route.ts')).toBe(true);
    });

    it('should respect include patterns', async () => {
      const routes: RouteInfo[] = [
        { filePath: '/test-app/app/products/page.tsx', urlPath: '/products', type: 'page' },
        { filePath: '/test-app/app/blog/page.tsx', urlPath: '/blog', type: 'page' },
        { filePath: '/test-app/app/about/page.tsx', urlPath: '/about', type: 'page' },
      ];

      const options: PluginOptions = {
        appDir: '/test-app/app',
        generatePerPageMarkdown: true,
        perPageOptions: {
          includePatterns: ['products/**', 'blog/**'],
        },
      };

      const result = await generatePerPageRoutes(routes, options);

      expect(result).toHaveLength(2);
      expect(result.some((r) => r.path.includes('products'))).toBe(true);
      expect(result.some((r) => r.path.includes('blog'))).toBe(true);
      expect(result.some((r) => r.path.includes('about'))).toBe(false);
    });

    it('should respect exclude patterns', async () => {
      const routes: RouteInfo[] = [
        { filePath: '/test-app/app/products/page.tsx', urlPath: '/products', type: 'page' },
        { filePath: '/test-app/app/admin/page.tsx', urlPath: '/admin', type: 'page' },
        { filePath: '/test-app/app/_internal/page.tsx', urlPath: '/_internal', type: 'page' },
      ];

      const options: PluginOptions = {
        appDir: '/test-app/app',
        generatePerPageMarkdown: true,
        perPageOptions: {
          excludePatterns: ['**/admin/**', '**/_*/**'],
        },
      };

      const result = await generatePerPageRoutes(routes, options);

      expect(result).toHaveLength(1);
      expect(result[0].path).toContain('products');
    });

    it('should handle dynamic routes [id]', async () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/test-app/app/products/[id]/page.tsx',
          urlPath: '/products/:id',
          type: 'page',
        },
      ];

      const options: PluginOptions = {
        appDir: '/test-app/app',
        generatePerPageMarkdown: true,
      };

      const result = await generatePerPageRoutes(routes, options);

      expect(result).toHaveLength(1);
      expect(result[0].path).toContain('[id].html.md');
    });

    it('should handle catch-all routes [...slug]', async () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/test-app/app/docs/[...slug]/page.tsx',
          urlPath: '/docs/*',
          type: 'page',
        },
      ];

      const options: PluginOptions = {
        appDir: '/test-app/app',
        generatePerPageMarkdown: true,
      };

      const result = await generatePerPageRoutes(routes, options);

      expect(result).toHaveLength(1);
      expect(result[0].path).toContain('[...slug].html.md');
    });

    it('should skip route groups in paths', async () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/test-app/app/(marketing)/products/page.tsx',
          urlPath: '/products',
          type: 'page',
        },
      ];

      const options: PluginOptions = {
        appDir: '/test-app/app',
        generatePerPageMarkdown: true,
      };

      const result = await generatePerPageRoutes(routes, options);

      expect(result).toHaveLength(1);
      // Route group should not appear in output path
      expect(result[0].path).not.toContain('(marketing)');
      expect(result[0].path).toContain('products.html.md');
    });

    it('should return empty array when generatePerPageMarkdown is false', async () => {
      const routes: RouteInfo[] = [
        { filePath: '/test-app/app/products/page.tsx', urlPath: '/products', type: 'page' },
      ];

      const options: PluginOptions = {
        appDir: '/test-app/app',
        generatePerPageMarkdown: false,
      };

      const result = await generatePerPageRoutes(routes, options);

      expect(result).toHaveLength(0);
    });

    it('should handle nested routes correctly', async () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/test-app/app/blog/posts/2024/page.tsx',
          urlPath: '/blog/posts/2024',
          type: 'page',
        },
      ];

      const options: PluginOptions = {
        appDir: '/test-app/app',
        generatePerPageMarkdown: true,
      };

      const result = await generatePerPageRoutes(routes, options);

      expect(result).toHaveLength(1);
      expect(result[0].path).toContain('blog/posts/2024.html.md');
    });
  });

  describe('createMarkdownContent', () => {
    it('should format markdown with H1 title', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          title: 'Products',
          description: 'Our products',
        },
        content: 'Product content here.',
      };

      const options: PluginOptions = {};

      const markdown = createMarkdownContent(route, options);

      expect(markdown).toContain('# Products');
    });

    it('should include blockquote description', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          title: 'Products',
          description: 'Our amazing products',
        },
        content: 'Content',
      };

      const options: PluginOptions = {};

      const markdown = createMarkdownContent(route, options);

      expect(markdown).toContain('> Our amazing products');
    });

    it('should include frontmatter when enabled', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          title: 'Products',
          description: 'Our products',
        },
        content: 'Content',
      };

      const options: PluginOptions = {
        siteUrl: 'https://example.com',
        perPageOptions: {
          includeMetadata: true,
        },
      };

      const markdown = createMarkdownContent(route, options);

      expect(markdown).toContain('---');
      expect(markdown).toContain('title: Products');
      expect(markdown).toContain('description: Our products');
      expect(markdown).toContain('url: https://example.com/products');
    });

    it('should not include frontmatter when disabled', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          title: 'Products',
        },
        content: 'Content',
      };

      const options: PluginOptions = {
        perPageOptions: {
          includeMetadata: false,
        },
      };

      const markdown = createMarkdownContent(route, options);

      expect(markdown).not.toContain('---');
    });

    it('should include page content', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          title: 'Products',
        },
        content: 'This is the main product content with multiple paragraphs.',
      };

      const options: PluginOptions = {};

      const markdown = createMarkdownContent(route, options);

      expect(markdown).toContain('This is the main product content');
    });

    it('should handle pages without content', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          title: 'Products',
          description: 'Our products',
        },
      };

      const options: PluginOptions = {};

      const markdown = createMarkdownContent(route, options);

      expect(markdown).toContain('# Products');
      expect(markdown).toContain('> Our products');
      // Should not crash, should still generate valid markdown
      expect(markdown.length).toBeGreaterThan(0);
    });

    it('should handle pages without metadata', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        content: 'Some content',
      };

      const options: PluginOptions = {};

      const markdown = createMarkdownContent(route, options);

      // Should derive title from URL path
      expect(markdown).toContain('# Products');
      expect(markdown.length).toBeGreaterThan(0);
    });

    it('should preserve code blocks in content', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/docs/page.tsx',
        urlPath: '/docs',
        type: 'page',
        metadata: {
          title: 'Documentation',
        },
        content: 'Example:\n\n```typescript\nconst foo = "bar";\n```\n\nMore content.',
      };

      const options: PluginOptions = {};

      const markdown = createMarkdownContent(route, options);

      expect(markdown).toContain('```typescript');
      expect(markdown).toContain('const foo = "bar";');
      expect(markdown).toContain('```');
    });

    it('should handle markdown formatting in content', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/docs/page.tsx',
        urlPath: '/docs',
        type: 'page',
        metadata: {
          title: 'Documentation',
        },
        content: '## Section 1\n\nParagraph with **bold** and *italic*.\n\n- List item 1\n- List item 2',
      };

      const options: PluginOptions = {};

      const markdown = createMarkdownContent(route, options);

      expect(markdown).toContain('## Section 1');
      expect(markdown).toContain('**bold**');
      expect(markdown).toContain('*italic*');
      expect(markdown).toContain('- List item 1');
    });
  });

  describe('createRouteHandlerContent', () => {
    it('should generate valid TypeScript route handler', () => {
      const markdownContent = '# Products\n\n> Our products';

      const routeHandler = createRouteHandlerContent(markdownContent);

      expect(routeHandler).toContain('export const dynamic = \'force-static\';');
      expect(routeHandler).toContain('export function GET()');
      expect(routeHandler).toContain('return new Response(');
      expect(routeHandler).toContain('Content-Type');
    });

    it('should include force-static directive', () => {
      const markdownContent = '# Test';

      const routeHandler = createRouteHandlerContent(markdownContent);

      expect(routeHandler).toContain("export const dynamic = 'force-static';");
    });

    it('should set correct Content-Type header', () => {
      const markdownContent = '# Test';

      const routeHandler = createRouteHandlerContent(markdownContent);

      expect(routeHandler).toContain('Content-Type');
      expect(routeHandler).toContain('text/markdown');
      expect(routeHandler).toContain('charset=utf-8');
    });

    it('should escape backticks in markdown content', () => {
      const markdownContent = '# Test\n\n```typescript\nconst foo = `bar`;\n```';

      const routeHandler = createRouteHandlerContent(markdownContent);

      // Should use template literal or proper escaping
      expect(routeHandler).not.toContain('const foo = `bar`;');
      // Should contain escaped version or use String.raw
      expect(routeHandler).toContain('\\`');
    });

    it('should escape special characters', () => {
      const markdownContent = 'Test with "quotes" and \\backslashes\\';

      const routeHandler = createRouteHandlerContent(markdownContent);

      // Should properly escape backslashes (doubled in template literal)
      expect(routeHandler).toContain('\\\\backslashes\\\\');
      // Quotes should be present but don't need escaping in template literals
      expect(routeHandler).toContain('"quotes"');
    });

    it('should handle multiline content', () => {
      const markdownContent = '# Title\n\n> Description\n\n## Section\n\nParagraph 1\n\nParagraph 2';

      const routeHandler = createRouteHandlerContent(markdownContent);

      expect(routeHandler).toContain('# Title');
      expect(routeHandler).toContain('> Description');
      expect(routeHandler).toContain('## Section');
      expect(routeHandler).toContain('Paragraph 1');
      expect(routeHandler).toContain('Paragraph 2');
    });

    it('should produce valid TypeScript that compiles', () => {
      const markdownContent = '# Test\n\n> Description\n\nContent';

      const routeHandler = createRouteHandlerContent(markdownContent);

      // Should have proper syntax
      expect(routeHandler).toMatch(/export\s+const\s+dynamic\s*=\s*['"]force-static['"];/);
      expect(routeHandler).toMatch(/export\s+function\s+GET\(\)\s*\{/);
      expect(routeHandler).toMatch(/return\s+new\s+Response\(/);
      expect(routeHandler).toMatch(/\}\s*$/); // Should end with closing brace
    });
  });

  describe('getRouteHandlerPath', () => {
    it('should generate correct path for simple route', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
      };

      const path = getRouteHandlerPath(route, '/test-app/app');

      expect(path).toBe('/test-app/app/products.html.md/route.ts');
    });

    it('should generate correct path for nested route', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/blog/posts/2024/page.tsx',
        urlPath: '/blog/posts/2024',
        type: 'page',
      };

      const path = getRouteHandlerPath(route, '/test-app/app');

      expect(path).toBe('/test-app/app/blog/posts/2024.html.md/route.ts');
    });

    it('should handle dynamic route [id]', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/products/[id]/page.tsx',
        urlPath: '/products/:id',
        type: 'page',
      };

      const path = getRouteHandlerPath(route, '/test-app/app');

      expect(path).toBe('/test-app/app/products/[id].html.md/route.ts');
    });

    it('should handle catch-all route [...slug]', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/docs/[...slug]/page.tsx',
        urlPath: '/docs/*',
        type: 'page',
      };

      const path = getRouteHandlerPath(route, '/test-app/app');

      expect(path).toBe('/test-app/app/docs/[...slug].html.md/route.ts');
    });

    it('should handle root route', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/page.tsx',
        urlPath: '/',
        type: 'page',
      };

      const path = getRouteHandlerPath(route, '/test-app/app');

      expect(path).toBe('/test-app/app/index.html.md/route.ts');
    });

    it('should exclude route groups from path', () => {
      const route: RouteInfo = {
        filePath: '/test-app/app/(marketing)/products/page.tsx',
        urlPath: '/products',
        type: 'page',
      };

      const path = getRouteHandlerPath(route, '/test-app/app');

      expect(path).not.toContain('(marketing)');
      expect(path).toBe('/test-app/app/products.html.md/route.ts');
    });
  });
});
