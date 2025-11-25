import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';
import {
  extractMetadata,
  enrichRoutesWithMetadata,
  getBestTitle,
  getBestDescription
} from '../../src/metadata-extractor';
import type { RouteInfo } from '../../src/types';

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

describe('Metadata Extractor', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vol.reset();
  });

  describe('extractMetadata', () => {
    it('should extract title from layout metadata', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': 'export default function Products() {}',
        '/app/products/layout.tsx': `
          import { Metadata } from 'next';
          export const metadata: Metadata = {
            title: 'Products | TurboDocx',
            description: 'Browse our products'
          };
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const metadata = await extractMetadata(routeInfo);

      expect(metadata).toBeDefined();
      expect(metadata?.title).toBe('Products | TurboDocx');
      expect(metadata?.description).toBe('Browse our products');
    });

    it('should extract keywords from layout metadata', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': 'export default function Products() {}',
        '/app/products/layout.tsx': `
          export const metadata = {
            title: 'Products',
            keywords: ['product', 'automation', 'document']
          };
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const metadata = await extractMetadata(routeInfo);

      expect(metadata?.keywords).toEqual(['product', 'automation', 'document']);
    });

    it('should extract OpenGraph metadata', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': 'export default function Products() {}',
        '/app/products/layout.tsx': `
          export const metadata = {
            title: 'Products',
            openGraph: {
              title: 'TurboDocx Products',
              description: 'Explore our product line',
              url: 'https://turbodocx.com/products',
              type: 'website'
            }
          };
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const metadata = await extractMetadata(routeInfo);

      expect(metadata?.openGraph).toBeDefined();
      expect(metadata?.openGraph?.title).toBe('TurboDocx Products');
      expect(metadata?.openGraph?.description).toBe('Explore our product line');
      expect(metadata?.openGraph?.url).toBe('https://turbodocx.com/products');
      expect(metadata?.openGraph?.type).toBe('website');
    });

    it('should return undefined for non-existent layout', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': 'export default function Products() {}',
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const metadata = await extractMetadata(routeInfo);

      expect(metadata).toBeUndefined();
    });

    it('should handle template title format', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': 'export default function Products() {}',
        '/app/products/layout.tsx': `
          export const metadata = {
            title: {
              default: 'TurboDocx',
              template: '%s | TurboDocx'
            }
          };
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const metadata = await extractMetadata(routeInfo);

      expect(metadata?.title).toBe('TurboDocx');
    });
  });

  describe('enrichRoutesWithMetadata', () => {
    it('should enrich multiple routes with metadata', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': 'export default function Products() {}',
        '/app/products/layout.tsx': `
          export const metadata = {
            title: 'Products',
            description: 'Our products'
          };
        `,
        '/app/about/page.tsx': 'export default function About() {}',
        '/app/about/layout.tsx': `
          export const metadata = {
            title: 'About Us',
            description: 'About our company'
          };
        `,
      });

      const routes: RouteInfo[] = [
        { filePath: '/app/products/page.tsx', urlPath: '/products', type: 'page' },
        { filePath: '/app/about/page.tsx', urlPath: '/about', type: 'page' },
      ];

      const enriched = await enrichRoutesWithMetadata(routes);

      expect(enriched).toHaveLength(2);
      expect(enriched[0].metadata?.title).toBe('Products');
      expect(enriched[0].metadata?.description).toBe('Our products');
      expect(enriched[1].metadata?.title).toBe('About Us');
      expect(enriched[1].metadata?.description).toBe('About our company');
    });
  });

  describe('getBestTitle', () => {
    it('should return metadata title if available', () => {
      const route: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          title: 'Products | TurboDocx'
        }
      };

      const title = getBestTitle(route);
      expect(title).toBe('Products');
    });

    it('should strip template suffix from title', () => {
      const route: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          title: 'Amazing Products | TurboDocx | Best Ever'
        }
      };

      const title = getBestTitle(route);
      expect(title).toBe('Amazing Products');
    });

    it('should return OpenGraph title if metadata title not available', () => {
      const route: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          openGraph: {
            title: 'TurboDocx Products'
          }
        }
      };

      const title = getBestTitle(route);
      expect(title).toBe('TurboDocx Products');
    });

    it('should derive title from URL if no metadata', () => {
      const route: RouteInfo = {
        filePath: '/app/products/awesome-product/page.tsx',
        urlPath: '/products/awesome-product',
        type: 'page'
      };

      const title = getBestTitle(route);
      expect(title).toBe('Awesome Product');
    });

    it('should return "Home" for root path', () => {
      const route: RouteInfo = {
        filePath: '/app/page.tsx',
        urlPath: '/',
        type: 'page'
      };

      const title = getBestTitle(route);
      expect(title).toBe('Home');
    });

    it('should capitalize words from URL path', () => {
      const route: RouteInfo = {
        filePath: '/app/about-us/our-team/page.tsx',
        urlPath: '/about-us/our-team',
        type: 'page'
      };

      const title = getBestTitle(route);
      expect(title).toBe('Our Team');
    });
  });

  describe('getBestDescription', () => {
    it('should return metadata description if available', () => {
      const route: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          description: 'Browse our amazing products'
        }
      };

      const description = getBestDescription(route);
      expect(description).toBe('Browse our amazing products');
    });

    it('should return OpenGraph description if metadata description not available', () => {
      const route: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          openGraph: {
            description: 'Check out our products'
          }
        }
      };

      const description = getBestDescription(route);
      expect(description).toBe('Check out our products');
    });

    it('should return undefined if no description available', () => {
      const route: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        metadata: {
          title: 'Products'
        }
      };

      const description = getBestDescription(route);
      expect(description).toBeUndefined();
    });
  });
});
