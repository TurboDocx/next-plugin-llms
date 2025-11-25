import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';
import {
  scanAppDirectory,
  filePathToUrlPath,
  groupRoutesBySection,
  sortRoutesByPriority
} from '../../src/scanner';
import type { PluginOptions, RouteInfo } from '../../src/types';

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

describe('Scanner', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vol.reset();
  });

  describe('scanAppDirectory', () => {
    it('should discover basic pages', async () => {
      vol.fromJSON({
        '/test-app/app/page.tsx': 'export default function Home() {}',
        '/test-app/app/about/page.tsx': 'export default function About() {}',
        '/test-app/app/contact/page.tsx': 'export default function Contact() {}',
      });

      const options: PluginOptions = {};
      const routes = await scanAppDirectory('/test-app/app', options);

      expect(routes).toHaveLength(3);
      expect(routes.map(r => r.urlPath)).toContain('/');
      expect(routes.map(r => r.urlPath)).toContain('/about');
      expect(routes.map(r => r.urlPath)).toContain('/contact');
    });

    it('should discover nested pages', async () => {
      vol.fromJSON({
        '/test-app/app/products/page.tsx': 'export default function Products() {}',
        '/test-app/app/products/[id]/page.tsx': 'export default function Product() {}',
        '/test-app/app/blog/[slug]/page.tsx': 'export default function BlogPost() {}',
      });

      const options: PluginOptions = {};
      const routes = await scanAppDirectory('/test-app/app', options);

      expect(routes).toHaveLength(3);
      expect(routes.map(r => r.urlPath)).toContain('/products');
      expect(routes.map(r => r.urlPath)).toContain('/products/:id');
      expect(routes.map(r => r.urlPath)).toContain('/blog/:slug');
    });

    it('should handle route groups (folders in parentheses)', async () => {
      vol.fromJSON({
        '/test-app/app/(marketing)/page.tsx': 'export default function Home() {}',
        '/test-app/app/(marketing)/about/page.tsx': 'export default function About() {}',
        '/test-app/app/(auth)/login/page.tsx': 'export default function Login() {}',
      });

      const options: PluginOptions = {};
      const routes = await scanAppDirectory('/test-app/app', options);

      expect(routes).toHaveLength(3);
      // Route groups should be removed from URLs
      expect(routes.map(r => r.urlPath)).toContain('/');
      expect(routes.map(r => r.urlPath)).toContain('/about');
      expect(routes.map(r => r.urlPath)).toContain('/login');
    });

    it('should handle catch-all routes', async () => {
      vol.fromJSON({
        '/test-app/app/docs/[...slug]/page.tsx': 'export default function Docs() {}',
      });

      const options: PluginOptions = {};
      const routes = await scanAppDirectory('/test-app/app', options);

      expect(routes).toHaveLength(1);
      expect(routes[0].urlPath).toBe('/docs/*');
    });

    it('should respect exclude patterns', async () => {
      vol.fromJSON({
        '/test-app/app/page.tsx': 'export default function Home() {}',
        '/test-app/app/api/hello/route.ts': 'export function GET() {}',
        '/test-app/app/admin/page.tsx': 'export default function Admin() {}',
        '/test-app/app/_internal/page.tsx': 'export default function Internal() {}',
      });

      const options: PluginOptions = {
        excludePatterns: ['**/admin/**', '**/_*.tsx'],
      };
      const routes = await scanAppDirectory('/test-app/app', options);

      // Should exclude api routes (default), admin, and _internal
      expect(routes).toHaveLength(1);
      expect(routes[0].urlPath).toBe('/');
    });

    it('should return empty array for non-existent directory', async () => {
      const options: PluginOptions = {};
      const routes = await scanAppDirectory('/non-existent', options);

      expect(routes).toEqual([]);
    });
  });

  describe('filePathToUrlPath', () => {
    it('should convert root path correctly', () => {
      expect(filePathToUrlPath('')).toBe('/');
      expect(filePathToUrlPath('/')).toBe('/');
    });

    it('should convert simple paths', () => {
      expect(filePathToUrlPath('about')).toBe('/about');
      expect(filePathToUrlPath('products')).toBe('/products');
    });

    it('should convert nested paths', () => {
      expect(filePathToUrlPath('products/shoes')).toBe('/products/shoes');
      expect(filePathToUrlPath('blog/2024/article')).toBe('/blog/2024/article');
    });

    it('should remove route groups', () => {
      expect(filePathToUrlPath('(marketing)/about')).toBe('/about');
      expect(filePathToUrlPath('(auth)/(login)/signin')).toBe('/signin');
    });

    it('should handle dynamic routes', () => {
      expect(filePathToUrlPath('products/[id]')).toBe('/products/:id');
      expect(filePathToUrlPath('blog/[year]/[slug]')).toBe('/blog/:year/:slug');
    });

    it('should handle catch-all routes', () => {
      expect(filePathToUrlPath('docs/[...slug]')).toBe('/docs/*');
      expect(filePathToUrlPath('[...catchAll]')).toBe('/*');
    });

    it('should handle optional catch-all routes', () => {
      expect(filePathToUrlPath('[[...slug]]')).toBe('/:slug');
    });

    it('should normalize path separators', () => {
      expect(filePathToUrlPath('products\\shoes')).toBe('/products/shoes');
    });
  });

  describe('groupRoutesBySection', () => {
    it('should group routes by content sources', () => {
      const routes: RouteInfo[] = [
        { filePath: '/app/products/page.tsx', urlPath: '/products', type: 'page' },
        { filePath: '/app/products/shoes/page.tsx', urlPath: '/products/shoes', type: 'page' },
        { filePath: '/app/blog/post1/page.tsx', urlPath: '/blog/post1', type: 'page' },
        { filePath: '/app/about/page.tsx', urlPath: '/about', type: 'page' },
      ];

      const options: PluginOptions = {
        sources: [
          { section: 'Products', pattern: 'products/**', priority: 'high' },
          { section: 'Blog', pattern: 'blog/**', priority: 'medium' },
        ],
      };

      const sections = groupRoutesBySection(routes, options);

      expect(sections.has('Products')).toBe(true);
      expect(sections.has('Blog')).toBe(true);
      expect(sections.has('Pages')).toBe(true);

      expect(sections.get('Products')).toHaveLength(2);
      expect(sections.get('Blog')).toHaveLength(1);
      expect(sections.get('Pages')).toHaveLength(1);
    });

    it('should handle routes with no matching section', () => {
      const routes: RouteInfo[] = [
        { filePath: '/app/page.tsx', urlPath: '/', type: 'page' },
        { filePath: '/app/about/page.tsx', urlPath: '/about', type: 'page' },
      ];

      const options: PluginOptions = {
        sources: [
          { section: 'Products', pattern: 'products/**', priority: 'high' },
        ],
      };

      const sections = groupRoutesBySection(routes, options);

      expect(sections.has('Pages')).toBe(true);
      expect(sections.get('Pages')).toHaveLength(2);
    });

    it('should remove empty sections', () => {
      const routes: RouteInfo[] = [
        { filePath: '/app/about/page.tsx', urlPath: '/about', type: 'page' },
      ];

      const options: PluginOptions = {
        sources: [
          { section: 'Products', pattern: 'products/**', priority: 'high' },
          { section: 'Blog', pattern: 'blog/**', priority: 'medium' },
        ],
      };

      const sections = groupRoutesBySection(routes, options);

      expect(sections.has('Products')).toBe(false);
      expect(sections.has('Blog')).toBe(false);
      expect(sections.has('Pages')).toBe(true);
    });
  });

  describe('sortRoutesByPriority', () => {
    it('should sort routes by priority (high, medium, low)', () => {
      const routes: RouteInfo[] = [
        { filePath: '/app/blog/page.tsx', urlPath: '/blog', type: 'page' },
        { filePath: '/app/products/page.tsx', urlPath: '/products', type: 'page' },
        { filePath: '/app/docs/page.tsx', urlPath: '/docs', type: 'page' },
      ];

      const options: PluginOptions = {
        sources: [
          { section: 'Products', pattern: 'products/**', priority: 'high' },
          { section: 'Blog', pattern: 'blog/**', priority: 'low' },
          { section: 'Docs', pattern: 'docs/**', priority: 'medium' },
        ],
      };

      const sorted = sortRoutesByPriority(routes, options);

      expect(sorted[0].urlPath).toBe('/products'); // high
      expect(sorted[1].urlPath).toBe('/docs'); // medium
      expect(sorted[2].urlPath).toBe('/blog'); // low
    });

    it('should sort alphabetically within same priority', () => {
      const routes: RouteInfo[] = [
        { filePath: '/app/zebra/page.tsx', urlPath: '/zebra', type: 'page' },
        { filePath: '/app/apple/page.tsx', urlPath: '/apple', type: 'page' },
        { filePath: '/app/banana/page.tsx', urlPath: '/banana', type: 'page' },
      ];

      const options: PluginOptions = {};

      const sorted = sortRoutesByPriority(routes, options);

      expect(sorted[0].urlPath).toBe('/apple');
      expect(sorted[1].urlPath).toBe('/banana');
      expect(sorted[2].urlPath).toBe('/zebra');
    });
  });
});
