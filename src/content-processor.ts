/**
 * Content processor for React/TSX page components
 * Extracts readable text content from page.tsx files
 */

import * as fs from 'fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { RouteInfo, Heading, ContentOptions } from './types';

// @babel/traverse has a CJS/ESM interop quirk: depending on bundler/runtime,
// the default export is either the function itself or `{ default: fn }`.
// Normalize both shapes so we always call the real traversal function.
const traverse: typeof _traverse =
  (_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse;

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
  return processContent(content, routeInfo.filePath, options);
}

// ─────────────────────────────────────────────────────────────────────
// CSS / class detection
//
// The previous heuristic conflated "any 2+ word string of word chars"
// with CSS, which silently filtered out legitimate prose like
// "Best in class". Worse, real CSS values that contain parens or units
// (var(--*), oklch(...), 1px solid var(--rule), etc.) slipped through
// because no rule recognized them.
//
// Split into two focused checks:
//   1. isCSSClassString — actual className-style strings (Tailwind etc.)
//   2. isCSSValueString — CSS values (functional, units, font stacks)
// ─────────────────────────────────────────────────────────────────────

// Common bare Tailwind / utility-CSS tokens (no hyphen, complete on their own).
const TAILWIND_BARE = new Set([
  'flex', 'grid', 'block', 'inline', 'contents', 'hidden', 'visible', 'invisible',
  'italic', 'underline', 'overline', 'antialiased', 'uppercase', 'lowercase',
  'capitalize', 'truncate', 'relative', 'absolute', 'fixed', 'static', 'sticky',
  'isolate', 'transform', 'transition',
]);

/**
 * Check if a string looks like a className-style string (Tailwind, BEM, etc.).
 *
 * Discriminator: Tailwind/utility classes are lowercase-start tokens with
 * structural markers (hyphens, colons, brackets). Plain English prose like
 * "Hello world" or "Best in class" starts with capitals and has none of
 * those markers, so it is preserved.
 */
function isCSSClassString(str: string): boolean {
  const trimmed = (str || '').trim();
  if (!trimmed) return false;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) return false;

  // Every token must shaped like a class: optional leading dash, lowercase
  // start, then word chars, digits, colons, slashes, brackets, or hyphens.
  const tokenShape = /^-?[a-z][\w/:[\].-]*$/;
  if (!tokens.every((t) => tokenShape.test(t))) return false;

  // Strong signal: at least one structural marker (hyphen, colon, bracket).
  if (/[-:[]/.test(trimmed)) return true;

  // Otherwise only matches if every bare token is a known utility.
  return tokens.every((t) => TAILWIND_BARE.has(t));
}

const CSS_VALUE_PATTERNS = [
  /^var\(--/,                                                           // var(--accent)
  /^(rgb|rgba|hsl|hsla|oklch|hwb|lab|lch)\(/,                           // color functions
  /^(calc|clamp|min|max|env|attr|counter|cubic-bezier|steps|fit-content|repeat|minmax)\(/,  // math/value functions
  /^url\(/,                                                             // url()
  /^(linear|radial|conic|repeating-linear|repeating-radial|repeating-conic)-gradient\(/,    // gradients
  /^[-+]?\d*\.?\d+(px|em|rem|%|vw|vh|vmin|vmax|fr|ch|ex|cm|mm|in|pt|pc|deg|rad|turn|s|ms)\b/, // number+unit
  /^#[0-9a-fA-F]{3,8}$/,                                                // hex color
  /^(none|auto|inherit|initial|unset|revert|currentColor|transparent)$/,// keyword values
];

const FONT_STACK_HINTS = /\b(serif|sans-serif|monospace|cursive|system-ui|ui-(?:serif|sans-serif|monospace|rounded)|Georgia|Helvetica|Arial|Times|Menlo|Consolas|Verdana|Tahoma|Courier|Roboto|Inter|Spectral|Fraunces)\b/;

/**
 * Check if a string looks like a CSS *value* (vs a class name).
 * Covers var(--*), oklch(...), font stacks, units, gradients, hex colors, etc.
 */
function isCSSValueString(str: string): boolean {
  const trimmed = (str || '').trim();
  if (!trimmed) return false;

  if (CSS_VALUE_PATTERNS.some((re) => re.test(trimmed))) return true;

  // Compound CSS shorthand like "1px solid var(--rule)" or
  // "0 2px 24px rgba(10,8,4,0.45)" — split by spaces and require at least
  // one segment to look CSS-y AND no segment to look like a sentence word.
  const tokens = trimmed.split(/\s+/);
  if (tokens.length > 1) {
    const cssLike = tokens.some((t) =>
      CSS_VALUE_PATTERNS.some((re) => re.test(t)),
    );
    const onlyTokensCSSLike = tokens.every(
      (t) => /^[#\d.\-+(),%a-zA-Z'"\/]+$/.test(t) && !/^[A-Z][a-z]{2,}$/.test(t),
    );
    if (cssLike && onlyTokensCSSLike) return true;
  }

  // Font stacks like "'Fraunces', 'Spectral', Georgia, serif"
  if (FONT_STACK_HINTS.test(trimmed) && /['"]?[\w\s-]+['"]?\s*,/.test(trimmed)) {
    return true;
  }

  return false;
}

function isLikelyCSSString(str: string): boolean {
  return isCSSClassString(str) || isCSSValueString(str);
}

/**
 * Walk up the AST and return true if any ancestor is a JSX attribute.
 * Catches strings inside style={{}} object expressions, className={cn(...)}
 * call args, etc. — places where the string is decorating an element rather
 * than being part of its visible content.
 */
function isInsideJSXAttribute(path: any): boolean {
  return !!(path.findParent && path.findParent((p: any) => p.isJSXAttribute && p.isJSXAttribute()));
}

/**
 * Process TSX content to extract readable text
 */
function processContent(content: string, filePath: string, options: ContentOptions): string {
  const {
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
      // Extract string literals (but skip JSX attribute values and CSS-y strings)
      StringLiteral(path: any) {
        const parent = path.parent;
        // Direct JSX attribute (legacy guard) plus deep-nested attribute values.
        if (parent && parent.type === 'JSXAttribute') return;
        if (isInsideJSXAttribute(path)) return;

        // Skip import/export source strings.
        if (parent && (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportAllDeclaration')) {
          return;
        }

        const value = path.node.value;
        if (!value || value.trim().length === 0) return;
        if (isLikelyCSSString(value)) return;

        extractedText.push(value.trim());
      },

      // Extract template literals (but skip JSX attribute values)
      TemplateLiteral(path: any) {
        const parent = path.parent;
        if (parent && parent.type === 'JSXAttribute') return;
        if (isInsideJSXAttribute(path)) return;

        const quasis = path.node.quasis.map((q: any) => q.value.cooked || '');
        const combined = quasis.join(' ');

        if (!combined.trim()) return;
        if (isLikelyCSSString(combined)) return;

        extractedText.push(combined.trim());
      },

      // Extract JSX text
      JSXText(path: any) {
        const value = path.node.value;
        if (value && value.trim().length > 0) {
          extractedText.push(value.trim());
        }
      },
    } as any);

    // Join and clean up extracted text
    let processedContent = extractedText.join('\n\n');

    // Remove excessive whitespace
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n');
    processedContent = processedContent.replace(/[ \t]{2,}/g, ' ');

    // Truncate if too long
    if (processedContent.length > maxContentLength) {
      processedContent = processedContent.substring(0, maxContentLength) + '...';
    }

    return processedContent;
  } catch (error) {
    console.warn(`Failed to parse content for ${filePath}:`, error);
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
    .filter((s) => !isLikelyCSSString(s))
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
      JSXElement(path: any) {
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
              .filter((child: any) => child.type === 'JSXText')
              .map((child: any) => child.value.trim())
              .join(' ');

            if (text) {
              headings.push({ level, text });
            }
          }
        }
      },
    } as any);
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
      // Clamp to valid markdown heading range to avoid RangeError on .repeat().
      const level = Math.max(1, Math.min(6, heading.level || 1));
      const prefix = '#'.repeat(level);
      parts.push(`${prefix} ${heading.text}`);
    });
  }

  // Add content
  if (route.content) {
    parts.push(route.content);
  }

  return parts.join('\n\n');
}
