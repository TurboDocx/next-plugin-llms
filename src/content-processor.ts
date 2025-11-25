/**
 * Content processor for React/TSX page components
 * Extracts readable text content from page.tsx files
 */

import * as fs from 'fs';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { RouteInfo, Heading, ContentOptions } from './types';

/**
 * Extract content from a page.tsx file
 */
export async function extractPageContent(
  routeInfo: RouteInfo,
  options: ContentOptions = {}
): Promise<string | undefined> {
  if (!fs.existsSync(routeInfo.filePath)) {
    return undefined;
  }

  const content = fs.readFileSync(routeInfo.filePath, 'utf-8');
  return processContent(content, options);
}

/**
 * Process TSX content to extract readable text
 */
function processContent(content: string, options: ContentOptions): string {
  const {
    stripJsx = true,
    preserveMarkdown = true,
    maxContentLength = 50000,
  } = options;

  try {
    // Parse the TSX file
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    const extractedText: string[] = [];

    // Traverse AST to extract text content
    traverse(ast, {
      // Extract string literals
      StringLiteral(path) {
        const value = path.node.value;
        if (value && value.trim().length > 0) {
          extractedText.push(value.trim());
        }
      },

      // Extract template literals
      TemplateLiteral(path) {
        const quasis = path.node.quasis.map((q) => q.value.cooked || '');
        const combined = quasis.join(' ');
        if (combined.trim().length > 0) {
          extractedText.push(combined.trim());
        }
      },

      // Extract JSX text
      JSXText(path) {
        const value = path.node.value;
        if (value && value.trim().length > 0) {
          extractedText.push(value.trim());
        }
      },
    });

    // Join and clean up extracted text
    let processedContent = extractedText.join('\n\n');

    // Remove excessive whitespace
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n');
    processedContent = processedContent.replace(/\s{2,}/g, ' ');

    // Truncate if too long
    if (processedContent.length > maxContentLength) {
      processedContent = processedContent.substring(0, maxContentLength) + '...';
    }

    return processedContent;
  } catch (error) {
    console.warn(`Failed to parse content for ${routeInfo.filePath}:`, error);
    return fallbackContentExtraction(content, options);
  }
}

/**
 * Fallback content extraction using regex
 */
function fallbackContentExtraction(content: string, options: ContentOptions): string {
  const { maxContentLength = 50000 } = options;

  // Remove imports
  let processed = content.replace(/^import\s+.*$/gm, '');

  // Remove comments
  processed = processed.replace(/\/\*[\s\S]*?\*\//g, '');
  processed = processed.replace(/\/\/.*/g, '');

  // Extract strings
  const strings = processed.match(/'([^']*)'|"([^"]*)"|`([^`]*)`/g) || [];
  const extractedText = strings
    .map((s) => s.slice(1, -1))
    .filter((s) => s.trim().length > 0)
    .join('\n\n');

  if (extractedText.length > maxContentLength) {
    return extractedText.substring(0, maxContentLength) + '...';
  }

  return extractedText;
}

/**
 * Extract headings from page content
 */
export async function extractHeadings(routeInfo: RouteInfo): Promise<Heading[]> {
  if (!fs.existsSync(routeInfo.filePath)) {
    return [];
  }

  const content = fs.readFileSync(routeInfo.filePath, 'utf-8');
  return parseHeadings(content);
}

/**
 * Parse headings from TSX content
 */
function parseHeadings(content: string): Heading[] {
  const headings: Heading[] = [];

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
      // Look for JSX elements like <h1>, <h2>, etc.
      JSXElement(path) {
        const openingElement = path.node.openingElement;
        const tagName = openingElement.name;

        // Check if it's an identifier (simple tag like h1, h2)
        if (tagName.type === 'JSXIdentifier') {
          const tag = tagName.name;
          const match = tag.match(/^h([1-6])$/);

          if (match) {
            const level = parseInt(match[1]) as 1 | 2 | 3 | 4 | 5 | 6;

            // Extract text content from children
            const children = path.node.children;
            const text = children
              .filter((child) => child.type === 'JSXText')
              .map((child: any) => child.value.trim())
              .join(' ');

            if (text) {
              headings.push({ level, text });
            }
          }
        }
      },
    });
  } catch (error) {
    console.warn(`Failed to extract headings:`, error);
  }

  return headings;
}

/**
 * Enrich routes with content
 */
export async function enrichRoutesWithContent(
  routes: RouteInfo[],
  options: ContentOptions = {}
): Promise<RouteInfo[]> {
  const enrichedRoutes: RouteInfo[] = [];

  for (const route of routes) {
    const content = await extractPageContent(route, options);
    const headings = await extractHeadings(route);

    enrichedRoutes.push({
      ...route,
      content,
      headings,
    });
  }

  return enrichedRoutes;
}

/**
 * Format content for LLM consumption
 */
export function formatContentForLLM(route: RouteInfo): string {
  const parts: string[] = [];

  // Add headings
  if (route.headings && route.headings.length > 0) {
    route.headings.forEach((heading) => {
      const prefix = '#'.repeat(heading.level);
      parts.push(`${prefix} ${heading.text}`);
    });
  }

  // Add content
  if (route.content) {
    parts.push(route.content);
  }

  return parts.join('\n\n');
}
