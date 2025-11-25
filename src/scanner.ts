/**
 * Scanner for Next.js app directory
 * Discovers routes, pages, and layouts
 */

import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import type { PluginOptions, RouteInfo } from './types';

/**
 * Scan the app directory for all routes and pages
 */
export async function scanAppDirectory(
  appDir: string,
  options: PluginOptions
): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];
  const absoluteAppDir = path.resolve(process.cwd(), appDir);

  if (!fs.existsSync(absoluteAppDir)) {
    console.warn(`App directory not found: ${absoluteAppDir}`);
    return routes;
  }

  await scanDirectory(absoluteAppDir, absoluteAppDir, routes, options);

  return routes;
}

/**
 * Recursively scan a directory
 */
async function scanDirectory(
  dir: string,
  appDir: string,
  routes: RouteInfo[],
  options: PluginOptions
): Promise<void> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(appDir, fullPath);

    // Skip if matches exclude patterns
    if (shouldExclude(relativePath, options.excludePatterns || [])) {
      continue;
    }

    if (entry.isDirectory()) {
      // Skip route groups (folders in parentheses)
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        // Scan inside route group but don't add to URL
        await scanDirectory(fullPath, appDir, routes, options);
        continue;
      }

      // Recursively scan subdirectories
      await scanDirectory(fullPath, appDir, routes, options);
    } else if (entry.isFile()) {
      // Process page.tsx, layout.tsx, and route.ts files
      if (
        entry.name === 'page.tsx' ||
        entry.name === 'page.ts' ||
        entry.name === 'layout.tsx' ||
        entry.name === 'layout.ts' ||
        entry.name === 'route.ts'
      ) {
        const routeInfo = createRouteInfo(fullPath, appDir, entry.name);

        // Only add pages to routes (not layouts or route handlers)
        if (entry.name.startsWith('page.')) {
          routes.push(routeInfo);
        }
      }
    }
  }
}

/**
 * Check if a path should be excluded
 */
function shouldExclude(relativePath: string, excludePatterns: string[]): boolean {
  // Default exclusions
  const defaultExclusions = [
    '**/api/**',
    '**/_*/**',     // Exclude directories starting with underscore
    '**/_*.tsx',    // Exclude files starting with underscore
    '**/_*.ts',
    '**/route.ts',
    '**/.*',
    '**/node_modules/**',
  ];

  const allPatterns = [...defaultExclusions, ...excludePatterns];

  return allPatterns.some((pattern) => minimatch(relativePath, pattern));
}

/**
 * Create a RouteInfo object from a file path
 */
function createRouteInfo(
  filePath: string,
  appDir: string,
  fileName: string
): RouteInfo {
  const relativePath = path.relative(appDir, path.dirname(filePath));
  const urlPath = filePathToUrlPath(relativePath);

  const type = fileName.startsWith('page')
    ? 'page'
    : fileName.startsWith('layout')
    ? 'layout'
    : 'route';

  return {
    filePath,
    urlPath,
    type,
  };
}

/**
 * Convert a file system path to a URL path
 * Handles Next.js routing conventions:
 * - Route groups: (group) are removed
 * - Dynamic routes: [id] becomes :id
 * - Catch-all: [...slug] becomes *
 */
export function filePathToUrlPath(filePath: string): string {
  // Normalize path separators (handle both forward and backslash)
  let urlPath = filePath.replace(/\\/g, '/');

  // Remove route groups (anything in parentheses)
  urlPath = urlPath.replace(/\([^)]+\)\/?/g, '');

  // Convert optional catch-all routes [[...slug]] to :slug (do this FIRST)
  urlPath = urlPath.replace(/\[\[\.\.\.([\w]+)\]\]/g, ':$1');

  // Convert catch-all routes [...slug] to * (do this BEFORE converting regular dynamic routes)
  urlPath = urlPath.replace(/\[\.\.\.([\w]+)\]/g, '*');

  // Convert dynamic routes [id] to :id (for display purposes)
  urlPath = urlPath.replace(/\[([^\]]+)\]/g, ':$1');

  // Ensure starts with /
  if (!urlPath.startsWith('/')) {
    urlPath = '/' + urlPath;
  }

  // Handle root index
  if (urlPath === '/' || urlPath === '') {
    return '/';
  }

  return urlPath;
}

/**
 * Group routes by section based on content sources
 */
export function groupRoutesBySection(
  routes: RouteInfo[],
  options: PluginOptions
): Map<string, RouteInfo[]> {
  const sections = new Map<string, RouteInfo[]>();

  // Default section for ungrouped routes
  sections.set('Pages', []);

  // Create sections from content sources
  if (options.sources) {
    for (const source of options.sources) {
      sections.set(source.section, []);
    }
  }

  // Assign routes to sections
  for (const route of routes) {
    let assigned = false;

    if (options.sources) {
      for (const source of options.sources) {
        // Normalize the file path to be relative and check against pattern
        let relativePath = route.filePath.replace(process.cwd(), '').replace(/^\//,'');

        // Try matching with **/pattern for flexibility
        if (minimatch(relativePath, source.pattern) ||
            minimatch(relativePath, `**/${source.pattern}`)) {
          sections.get(source.section)?.push(route);
          assigned = true;
          break;
        }
      }
    }

    // If not assigned to any section, add to default
    if (!assigned) {
      sections.get('Pages')?.push(route);
    }
  }

  // Remove empty sections
  for (const [section, routes] of sections.entries()) {
    if (routes.length === 0) {
      sections.delete(section);
    }
  }

  return sections;
}

/**
 * Sort routes by priority
 */
export function sortRoutesByPriority(
  routes: RouteInfo[],
  options: PluginOptions
): RouteInfo[] {
  const priorityMap: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  return routes.sort((a, b) => {
    // Get priority from sources
    let aPriority = 2; // default medium
    let bPriority = 2;

    if (options.sources) {
      for (const source of options.sources) {
        // Normalize the file paths to be relative
        const aRelPath = a.filePath.replace(process.cwd(), '').replace(/^\//,'');
        const bRelPath = b.filePath.replace(process.cwd(), '').replace(/^\//,'');

        // Try matching with **/pattern for flexibility
        if (minimatch(aRelPath, source.pattern) ||
            minimatch(aRelPath, `**/${source.pattern}`)) {
          aPriority = priorityMap[source.priority || 'medium'];
        }
        if (minimatch(bRelPath, source.pattern) ||
            minimatch(bRelPath, `**/${source.pattern}`)) {
          bPriority = priorityMap[source.priority || 'medium'];
        }
      }
    }

    // Sort by priority (high to low)
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    // If same priority, sort alphabetically by URL
    return a.urlPath.localeCompare(b.urlPath);
  });
}
