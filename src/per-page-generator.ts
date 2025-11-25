/**
 * Per-page markdown endpoint generator
 * Creates .html.md route handlers for each page
 */

import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import type { RouteInfo, PluginOptions, GeneratedFile } from './types';
import { getBestTitle, getBestDescription } from './metadata-extractor';

/**
 * Generate per-page markdown route handlers for all routes
 */
export async function generatePerPageRoutes(
  routes: RouteInfo[],
  options: PluginOptions
): Promise<GeneratedFile[]> {
  const generatedFiles: GeneratedFile[] = [];

  // Check if per-page generation is enabled
  if (!options.generatePerPageMarkdown) {
    return generatedFiles;
  }

  const appDir = path.resolve(process.cwd(), options.appDir || 'app');

  // Filter routes based on include/exclude patterns
  const filteredRoutes = filterRoutes(routes, options);

  for (const route of filteredRoutes) {
    try {
      // Generate markdown content
      const markdownContent = createMarkdownContent(route, options);

      // Generate route handler code
      const routeHandlerCode = createRouteHandlerContent(markdownContent);

      // Determine output path
      const routeHandlerPath = getRouteHandlerPath(route, appDir);

      // Write route handler file
      const routeDir = path.dirname(routeHandlerPath);
      fs.mkdirSync(routeDir, { recursive: true });
      fs.writeFileSync(routeHandlerPath, routeHandlerCode, 'utf-8');

      generatedFiles.push({
        path: routeHandlerPath,
        type: 'per-page',
        size: Buffer.byteLength(routeHandlerCode, 'utf-8'),
        routeCount: 1,
      });
    } catch (error) {
      console.error(`Error generating per-page route for ${route.urlPath}:`, error);
    }
  }

  return generatedFiles;
}

/**
 * Filter routes based on include/exclude patterns
 */
function filterRoutes(routes: RouteInfo[], options: PluginOptions): RouteInfo[] {
  const perPageOptions = options.perPageOptions || {};
  const includePatterns = perPageOptions.includePatterns || [];
  const excludePatterns = perPageOptions.excludePatterns || [];

  return routes.filter((route) => {
    const relativePath = route.filePath.replace(process.cwd(), '').replace(/^\//, '');

    // If include patterns are specified, route must match at least one
    if (includePatterns.length > 0) {
      const matches = includePatterns.some(
        (pattern) =>
          minimatch(relativePath, pattern) || minimatch(relativePath, `**/${pattern}`)
      );
      if (!matches) {
        return false;
      }
    }

    // If exclude patterns are specified, route must not match any
    if (excludePatterns.length > 0) {
      const excluded = excludePatterns.some(
        (pattern) =>
          minimatch(relativePath, pattern) || minimatch(relativePath, `**/${pattern}`)
      );
      if (excluded) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Create markdown content for a route
 */
export function createMarkdownContent(
  route: RouteInfo,
  options: PluginOptions
): string {
  const parts: string[] = [];

  const title = getBestTitle(route);
  const description = getBestDescription(route);

  // Include frontmatter if enabled (default true)
  const includeMetadata = options.perPageOptions?.includeMetadata !== false;

  if (includeMetadata && (title || description || options.siteUrl)) {
    parts.push('---');

    if (title) {
      parts.push(`title: ${title}`);
    }

    if (description) {
      parts.push(`description: ${description}`);
    }

    if (options.siteUrl && route.urlPath) {
      const url = buildUrl(route.urlPath, options.siteUrl);
      parts.push(`url: ${url}`);
    }

    parts.push('---');
    parts.push('');
  }

  // H1 title
  parts.push(`# ${title}`);
  parts.push('');

  // Blockquote description
  if (description) {
    parts.push(`> ${description}`);
    parts.push('');
  }

  // Page content
  if (route.content) {
    parts.push(route.content.trim());
  }

  return parts.join('\n');
}

/**
 * Create TypeScript route handler code
 */
export function createRouteHandlerContent(markdownContent: string): string {
  // Escape backticks and backslashes in the markdown content
  const escapedContent = markdownContent
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/`/g, '\\`')     // Escape backticks
    .replace(/\$/g, '\\$');   // Escape dollar signs for template literals

  const code = `export const dynamic = 'force-static';

export function GET() {
  const markdown = \`${escapedContent}\`;

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
`;

  return code;
}

/**
 * Get the route handler file path for a given route
 */
export function getRouteHandlerPath(route: RouteInfo, appDir: string): string {
  // Extract the relative path from the app directory
  const routeDir = path.dirname(route.filePath);
  const relativePath = path.relative(appDir, routeDir);

  // Remove route groups (folders in parentheses)
  const pathWithoutGroups = relativePath.replace(/\([^)]+\)\/?/g, '');

  // Handle root route specially
  if (!pathWithoutGroups || pathWithoutGroups === '.') {
    return path.join(appDir, 'index.html.md', 'route.ts');
  }

  // Convert the path to .html.md format
  // For nested routes like blog/posts/2024, create blog/posts/2024.html.md/route.ts
  // For dynamic routes like products/[id], create products/[id].html.md/route.ts
  const segments = pathWithoutGroups.split(path.sep);

  // Last segment becomes the .html.md directory
  const lastSegment = segments.pop();
  const parentPath = segments.length > 0 ? segments.join(path.sep) : '';

  const htmlMdDir = parentPath
    ? path.join(appDir, parentPath, `${lastSegment}.html.md`)
    : path.join(appDir, `${lastSegment}.html.md`);

  return path.join(htmlMdDir, 'route.ts');
}

/**
 * Build a full URL from a path
 */
function buildUrl(urlPath: string, siteUrl?: string): string {
  if (!siteUrl) {
    return urlPath;
  }

  const base = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  const path = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

  return `${base}${path}`;
}
