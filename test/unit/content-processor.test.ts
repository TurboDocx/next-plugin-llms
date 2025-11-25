import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';
import {
  extractPageContent,
  extractHeadings,
  enrichRoutesWithContent,
  formatContentForLLM
} from '../../src/content-processor';
import type { RouteInfo, ContentOptions } from '../../src/types';

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

describe('Content Processor', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vol.reset();
  });

  describe('extractPageContent', () => {
    it('should extract text from JSX elements', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': `
          export default function Products() {
            return (
              <div>
                <h1>Our Products</h1>
                <p>We offer amazing products for document automation.</p>
              </div>
            );
          }
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const content = await extractPageContent(routeInfo);

      expect(content).toBeDefined();
      expect(content).toContain('Our Products');
      expect(content).toContain('We offer amazing products for document automation');
    });

    it('should extract string literals', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': `
          export default function Products() {
            const title = "Amazing Products";
            const description = 'Best in class';
            return <div>{title}</div>;
          }
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const content = await extractPageContent(routeInfo);

      expect(content).toContain('Amazing Products');
      expect(content).toContain('Best in class');
    });

    it('should extract template literals', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': `
          export default function Products() {
            const message = \`Welcome to our products page\`;
            return <div>{message}</div>;
          }
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const content = await extractPageContent(routeInfo);

      expect(content).toContain('Welcome to our products page');
    });

    it('should handle maxContentLength option', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': `
          export default function Products() {
            return <div>${'A'.repeat(1000)}</div>;
          }
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const options: ContentOptions = {
        maxContentLength: 100
      };

      const content = await extractPageContent(routeInfo, options);

      expect(content).toBeDefined();
      expect(content!.length).toBeLessThanOrEqual(104); // 100 + '...'
      expect(content!.endsWith('...')).toBe(true);
    });

    it('should return undefined for non-existent file', async () => {
      const routeInfo: RouteInfo = {
        filePath: '/app/non-existent/page.tsx',
        urlPath: '/non-existent',
        type: 'page'
      };

      const content = await extractPageContent(routeInfo);

      expect(content).toBeUndefined();
    });

    it('should handle complex JSX with nested elements', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': `
          export default function Products() {
            return (
              <div>
                <header>
                  <h1>Products</h1>
                  <nav>
                    <a href="/">Home</a>
                  </nav>
                </header>
                <main>
                  <section>
                    <h2>Featured Product</h2>
                    <p>TurboDocx is amazing</p>
                  </section>
                </main>
              </div>
            );
          }
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const content = await extractPageContent(routeInfo);

      expect(content).toContain('Products');
      expect(content).toContain('Home');
      expect(content).toContain('Featured Product');
      expect(content).toContain('TurboDocx is amazing');
    });
  });

  describe('extractHeadings', () => {
    it('should extract h1 headings', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': `
          export default function Products() {
            return (
              <div>
                <h1>Main Title</h1>
                <p>Content</p>
              </div>
            );
          }
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const headings = await extractHeadings(routeInfo);

      expect(headings).toHaveLength(1);
      expect(headings[0]).toEqual({
        level: 1,
        text: 'Main Title'
      });
    });

    it('should extract multiple heading levels', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': `
          export default function Products() {
            return (
              <div>
                <h1>Main Title</h1>
                <h2>Section 1</h2>
                <h3>Subsection 1.1</h3>
                <h2>Section 2</h2>
              </div>
            );
          }
        `,
      });

      const routeInfo: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page'
      };

      const headings = await extractHeadings(routeInfo);

      expect(headings).toHaveLength(4);
      expect(headings[0]).toEqual({ level: 1, text: 'Main Title' });
      expect(headings[1]).toEqual({ level: 2, text: 'Section 1' });
      expect(headings[2]).toEqual({ level: 3, text: 'Subsection 1.1' });
      expect(headings[3]).toEqual({ level: 2, text: 'Section 2' });
    });

    it('should return empty array for non-existent file', async () => {
      const routeInfo: RouteInfo = {
        filePath: '/app/non-existent/page.tsx',
        urlPath: '/non-existent',
        type: 'page'
      };

      const headings = await extractHeadings(routeInfo);

      expect(headings).toEqual([]);
    });
  });

  describe('enrichRoutesWithContent', () => {
    it('should enrich routes with content and headings', async () => {
      vol.fromJSON({
        '/app/products/page.tsx': `
          export default function Products() {
            return (
              <div>
                <h1>Products</h1>
                <p>Our amazing products</p>
              </div>
            );
          }
        `,
        '/app/about/page.tsx': `
          export default function About() {
            return (
              <div>
                <h1>About Us</h1>
                <p>We are TurboDocx</p>
              </div>
            );
          }
        `,
      });

      const routes: RouteInfo[] = [
        { filePath: '/app/products/page.tsx', urlPath: '/products', type: 'page' },
        { filePath: '/app/about/page.tsx', urlPath: '/about', type: 'page' },
      ];

      const enriched = await enrichRoutesWithContent(routes);

      expect(enriched).toHaveLength(2);

      expect(enriched[0].content).toContain('Products');
      expect(enriched[0].content).toContain('Our amazing products');
      expect(enriched[0].headings).toHaveLength(1);
      expect(enriched[0].headings?.[0].text).toBe('Products');

      expect(enriched[1].content).toContain('About Us');
      expect(enriched[1].content).toContain('We are TurboDocx');
      expect(enriched[1].headings).toHaveLength(1);
      expect(enriched[1].headings?.[0].text).toBe('About Us');
    });
  });

  describe('formatContentForLLM', () => {
    it('should format content with headings', () => {
      const route: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        headings: [
          { level: 1, text: 'Products' },
          { level: 2, text: 'Features' },
          { level: 3, text: 'Automation' },
        ],
        content: 'Our products help you automate documents.'
      };

      const formatted = formatContentForLLM(route);

      expect(formatted).toContain('# Products');
      expect(formatted).toContain('## Features');
      expect(formatted).toContain('### Automation');
      expect(formatted).toContain('Our products help you automate documents');
    });

    it('should handle routes without headings', () => {
      const route: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        content: 'Just some content without headings.'
      };

      const formatted = formatContentForLLM(route);

      expect(formatted).toBe('Just some content without headings.');
    });

    it('should handle routes without content', () => {
      const route: RouteInfo = {
        filePath: '/app/products/page.tsx',
        urlPath: '/products',
        type: 'page',
        headings: [
          { level: 1, text: 'Products' },
        ]
      };

      const formatted = formatContentForLLM(route);

      expect(formatted).toBe('# Products');
    });
  });
});
