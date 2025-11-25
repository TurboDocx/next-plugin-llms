import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';
import {
  generateLLMsTxt,
  generateLLMsFullTxt,
  generateRouteHandlerFile
} from '../../src/generator';
import type { RouteInfo, PluginOptions } from '../../src/types';

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

describe('Generator', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vol.reset();
  });

  describe('generateLLMsTxt', () => {
    it('should generate basic llms.txt format', () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/app/page.tsx',
          urlPath: '/',
          type: 'page',
          metadata: {
            title: 'Home',
            description: 'Welcome to TurboDocx'
          }
        },
        {
          filePath: '/app/products/page.tsx',
          urlPath: '/products',
          type: 'page',
          metadata: {
            title: 'Products',
            description: 'Our products'
          }
        }
      ];

      const options: PluginOptions = {
        title: 'TurboDocx',
        description: 'Document automation platform',
        siteUrl: 'https://turbodocx.com'
      };

      const result = generateLLMsTxt(routes, options);

      expect(result).toContain('# TurboDocx');
      expect(result).toContain('> Document automation platform');
      expect(result).toContain('[Home](https://turbodocx.com/)');
      expect(result).toContain('[Products](https://turbodocx.com/products)');
      expect(result).toContain('Welcome to TurboDocx');
      expect(result).toContain('Our products');
    });

    it('should include custom sections', () => {
      const routes: RouteInfo[] = [];

      const options: PluginOptions = {
        title: 'TurboDocx',
        siteUrl: 'https://turbodocx.com',
        customSections: [
          {
            title: 'Open Source',
            items: [
              {
                title: '@turbodocx/html-to-docx',
                url: 'https://github.com/TurboDocx/html-to-docx',
                description: '26,000+ downloads'
              }
            ]
          }
        ]
      };

      const result = generateLLMsTxt(routes, options);

      expect(result).toContain('## Open Source');
      expect(result).toContain('[@turbodocx/html-to-docx](https://github.com/TurboDocx/html-to-docx): 26,000+ downloads');
    });

    it('should group routes by sections', () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/app/products/shoes/page.tsx',
          urlPath: '/products/shoes',
          type: 'page',
          metadata: { title: 'Shoes' }
        },
        {
          filePath: '/app/blog/post1/page.tsx',
          urlPath: '/blog/post1',
          type: 'page',
          metadata: { title: 'Blog Post 1' }
        }
      ];

      const options: PluginOptions = {
        title: 'TurboDocx',
        siteUrl: 'https://turbodocx.com',
        sources: [
          { section: 'Products', pattern: 'products/**', priority: 'high' },
          { section: 'Blog', pattern: 'blog/**', priority: 'medium' }
        ]
      };

      const result = generateLLMsTxt(routes, options);

      expect(result).toContain('## Products');
      expect(result).toContain('## Blog');
      expect(result).toContain('[Shoes]');
      expect(result).toContain('[Blog Post 1]');
    });

    it('should handle routes without descriptions', () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/app/page.tsx',
          urlPath: '/',
          type: 'page',
          metadata: { title: 'Home' }
        }
      ];

      const options: PluginOptions = {
        title: 'TurboDocx',
        siteUrl: 'https://turbodocx.com'
      };

      const result = generateLLMsTxt(routes, options);

      // Should not have ': ' after URL if no description
      expect(result).toMatch(/\[Home\]\(https:\/\/turbodocx\.com\/\)$/m);
    });
  });

  describe('generateLLMsFullTxt', () => {
    it('should generate llms-full.txt with content', () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/app/products/page.tsx',
          urlPath: '/products',
          type: 'page',
          metadata: {
            title: 'Products',
            description: 'Our products'
          },
          content: 'We offer amazing document automation products.',
          headings: [
            { level: 1, text: 'Products' },
            { level: 2, text: 'Features' }
          ]
        }
      ];

      const options: PluginOptions = {
        title: 'TurboDocx',
        description: 'Document automation',
        siteUrl: 'https://turbodocx.com'
      };

      const result = generateLLMsFullTxt(routes, options);

      expect(result).toContain('# TurboDocx');
      expect(result).toContain('> Document automation');
      expect(result).toContain('## Pages');
      expect(result).toContain('### Products');
      expect(result).toContain('URL: https://turbodocx.com/products');
      expect(result).toContain('Our products');
      expect(result).toContain('# Products');
      expect(result).toContain('## Features');
      expect(result).toContain('We offer amazing document automation products');
      expect(result).toContain('---');
    });

    it('should include standard notice about llmstxt.org', () => {
      const routes: RouteInfo[] = [];

      const options: PluginOptions = {
        title: 'TurboDocx'
      };

      const result = generateLLMsFullTxt(routes, options);

      expect(result).toContain('This file contains all documentation content');
      expect(result).toContain('llmstxt.org');
    });

    it('should handle routes without content', () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/app/page.tsx',
          urlPath: '/',
          type: 'page',
          metadata: {
            title: 'Home',
            description: 'Welcome'
          }
        }
      ];

      const options: PluginOptions = {
        title: 'TurboDocx',
        siteUrl: 'https://turbodocx.com'
      };

      const result = generateLLMsFullTxt(routes, options);

      expect(result).toContain('### Home');
      expect(result).toContain('URL: https://turbodocx.com/');
      expect(result).toContain('Welcome');
      expect(result).toContain('---');
    });
  });

  describe('generateRouteHandlerFile', () => {
    it('should generate valid Next.js route handler', () => {
      const content = '# TurboDocx\n\n> Document automation';

      const routeHandler = generateRouteHandlerFile(content);

      expect(routeHandler).toContain("export const dynamic = 'force-static'");
      expect(routeHandler).toContain('export function GET()');
      expect(routeHandler).toContain('const markdown = `');
      expect(routeHandler).toContain('# TurboDocx');
      expect(routeHandler).toContain('> Document automation');
      expect(routeHandler).toContain('return new Response(markdown');
      expect(routeHandler).toContain("'Content-Type': 'text/plain; charset=utf-8'");
    });

    it('should escape backticks in content', () => {
      const content = 'Use `code` blocks like this: ```js\nconst x = 1;\n```';

      const routeHandler = generateRouteHandlerFile(content);

      // Backticks should be escaped
      expect(routeHandler).toContain('\\`code\\`');
      expect(routeHandler).toContain('\\`\\`\\`js');
    });

    it('should handle multiline content', () => {
      const content = 'Line 1\nLine 2\nLine 3';

      const routeHandler = generateRouteHandlerFile(content);

      expect(routeHandler).toContain('Line 1');
      expect(routeHandler).toContain('Line 2');
      expect(routeHandler).toContain('Line 3');
    });
  });

  describe('URL building', () => {
    it('should build URLs with siteUrl', () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/app/products/page.tsx',
          urlPath: '/products',
          type: 'page',
          metadata: { title: 'Products' }
        }
      ];

      const options: PluginOptions = {
        title: 'TurboDocx',
        siteUrl: 'https://turbodocx.com'
      };

      const result = generateLLMsTxt(routes, options);

      expect(result).toContain('https://turbodocx.com/products');
    });

    it('should handle siteUrl with trailing slash', () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/app/products/page.tsx',
          urlPath: '/products',
          type: 'page',
          metadata: { title: 'Products' }
        }
      ];

      const options: PluginOptions = {
        title: 'TurboDocx',
        siteUrl: 'https://turbodocx.com/'
      };

      const result = generateLLMsTxt(routes, options);

      // Should not have double slash
      expect(result).toContain('https://turbodocx.com/products');
      expect(result).not.toContain('https://turbodocx.com//products');
    });

    it('should use relative URLs without siteUrl', () => {
      const routes: RouteInfo[] = [
        {
          filePath: '/app/products/page.tsx',
          urlPath: '/products',
          type: 'page',
          metadata: { title: 'Products' }
        }
      ];

      const options: PluginOptions = {
        title: 'TurboDocx'
      };

      const result = generateLLMsTxt(routes, options);

      expect(result).toContain('[Products](/products)');
    });
  });
});
