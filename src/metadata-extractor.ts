/**
 * Metadata extractor for Next.js layout.tsx files
 * Extracts metadata export from layout files
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RouteInfo, RouteMetadata } from './types';

/**
 * Extract metadata from a layout.tsx file
 */
export async function extractMetadata(routeInfo: RouteInfo): Promise<RouteMetadata | undefined> {
  const layoutPath = findLayoutFile(routeInfo.filePath);

  if (!layoutPath || !fs.existsSync(layoutPath)) {
    return undefined;
  }

  const content = fs.readFileSync(layoutPath, 'utf-8');
  return parseMetadataFromContent(content);
}

/**
 * Find the layout.tsx file for a given page
 */
function findLayoutFile(pagePath: string): string | null {
  const dir = path.dirname(pagePath);

  // Check for layout.tsx in the same directory
  const layoutTsx = path.join(dir, 'layout.tsx');
  if (fs.existsSync(layoutTsx)) {
    return layoutTsx;
  }

  // Check for layout.ts
  const layoutTs = path.join(dir, 'layout.ts');
  if (fs.existsSync(layoutTs)) {
    return layoutTs;
  }

  return null;
}

/**
 * Parse metadata from file content
 * This is a simple regex-based parser for metadata exports
 */
function parseMetadataFromContent(content: string): RouteMetadata {
  const metadata: RouteMetadata = {};

  // Extract title
  const titleMatch = content.match(/title:\s*['"](.*?)['"]/);
  if (titleMatch) {
    metadata.title = titleMatch[1];
  } else {
    // Check for template format
    const templateMatch = content.match(/default:\s*['"](.*?)['"]/);
    if (templateMatch) {
      metadata.title = templateMatch[1];
    }
  }

  // Extract description
  const descMatch = content.match(/description:\s*['"](.*?)['"]/);
  if (descMatch) {
    metadata.description = descMatch[1];
  }

  // Extract keywords
  const keywordsMatch = content.match(/keywords:\s*\[([\s\S]*?)\]/);
  if (keywordsMatch) {
    const keywordsStr = keywordsMatch[1];
    metadata.keywords = keywordsStr
      .split(',')
      .map((k) => k.trim().replace(/['"]/g, ''))
      .filter((k) => k.length > 0);
  }

  // Extract OpenGraph metadata
  const ogTitleMatch = content.match(/openGraph:\s*{[\s\S]*?title:\s*['"](.*?)['"]/);
  const ogDescMatch = content.match(/openGraph:\s*{[\s\S]*?description:\s*['"](.*?)['"]/);
  const ogUrlMatch = content.match(/openGraph:\s*{[\s\S]*?url:\s*['"](.*?)['"]/);
  const ogTypeMatch = content.match(/openGraph:\s*{[\s\S]*?type:\s*['"](.*?)['"]/);

  if (ogTitleMatch || ogDescMatch || ogUrlMatch || ogTypeMatch) {
    metadata.openGraph = {
      title: ogTitleMatch?.[1],
      description: ogDescMatch?.[1],
      url: ogUrlMatch?.[1],
      type: ogTypeMatch?.[1],
    };
  }

  return metadata;
}

/**
 * Enrich route info with metadata from layouts
 */
export async function enrichRoutesWithMetadata(routes: RouteInfo[]): Promise<RouteInfo[]> {
  const enrichedRoutes: RouteInfo[] = [];

  for (const route of routes) {
    const metadata = await extractMetadata(route);
    enrichedRoutes.push({
      ...route,
      metadata,
    });
  }

  return enrichedRoutes;
}

/**
 * Get the best title for a route
 * Priority: metadata.title > openGraph.title > derived from URL
 */
export function getBestTitle(route: RouteInfo): string {
  if (route.metadata?.title) {
    // Remove template suffix if present
    return route.metadata.title.replace(/\s*\|.*$/, '').trim();
  }

  if (route.metadata?.openGraph?.title) {
    return route.metadata.openGraph.title;
  }

  // Derive from URL path
  const segments = route.urlPath.split('/').filter((s) => s.length > 0);
  if (segments.length === 0) {
    return 'Home';
  }

  const lastSegment = segments[segments.length - 1];
  return lastSegment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get the best description for a route
 */
export function getBestDescription(route: RouteInfo): string | undefined {
  if (route.metadata?.description) {
    return route.metadata.description;
  }

  if (route.metadata?.openGraph?.description) {
    return route.metadata.openGraph.description;
  }

  return undefined;
}
