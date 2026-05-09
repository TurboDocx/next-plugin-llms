/**
 * Per-page markdown endpoint generator
 * Creates .html.md route handlers for each page
 */

import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import type {
  RouteInfo,
  PluginOptions,
  GeneratedFile,
  DynamicRouteEntry,
} from './types';
import { getBestTitle, getBestDescription } from './metadata-extractor';

/**
 * Detect whether a route's file path contains any dynamic [param] segments.
 */
function isDynamicRoute(route: RouteInfo): boolean {
  return /\[[^\]]+\]/.test(route.filePath);
}

/**
 * Build the route key the user would supply in `dynamicRoutes` (e.g.
 * `notes/[slug]`) from a route's file path, by stripping `appDir` and the
 * trailing `/page.tsx`.
 */
function dynamicRouteKey(route: RouteInfo, appDir: string): string {
  const dir = path.dirname(route.filePath);
  const rel = path.relative(appDir, dir).split(path.sep).join('/');
  return rel;
}

/**
 * Substitute [param] segments with the entry's param values. The trailing
 * segment becomes the literal `<value>.html.md` filename, mirroring the
 * "one literal directory per slug" pattern (so static export works without
 * needing generateStaticParams on the .html.md route).
 */
function expandDynamicRoutePath(
  routeFilePath: string,
  appDir: string,
  params: Record<string, string>,
): string {
  // /app/notes/[slug]/page.tsx → /app/notes/<slug>.html.md/route.ts
  const dir = path.dirname(routeFilePath);
  const rel = path.relative(appDir, dir);
  const segments = rel.split(path.sep);

  const substituted = segments.map((seg) =>
    seg.replace(/\[([^\]]+)\]/g, (_, name: string) => {
      if (params[name] === undefined) {
        throw new Error(
          `Missing param "${name}" for dynamic route ${rel}. ` +
            `Provide it in dynamicRoutes['${rel.split(path.sep).join('/')}'][i].params.`,
        );
      }
      return params[name];
    }),
  );

  // The last segment becomes <value>.html.md/
  const last = substituted.pop();
  const parent = substituted.length > 0 ? path.join(appDir, ...substituted) : appDir;
  return path.join(parent, `${last}.html.md`, 'route.ts');
}

/**
 * Build the URL path for a dynamic-route entry by substituting `:param` /
 * `[param]` segments in the page's urlPath with the entry's values.
 */
function expandUrlPath(urlPath: string, params: Record<string, string>): string {
  let out = urlPath;
  for (const [name, value] of Object.entries(params)) {
    out = out.replace(new RegExp(`:${name}\\b`, 'g'), value);
    out = out.replace(new RegExp(`\\[${name}\\]`, 'g'), value);
  }
  return out;
}

/**
 * Build a synthetic RouteInfo for a single dynamic-route entry. Inherits
 * from the template route, applies entry overrides on top.
 */
function expandDynamicRoute(
  template: RouteInfo,
  entry: DynamicRouteEntry,
): RouteInfo {
  return {
    ...template,
    urlPath: expandUrlPath(template.urlPath, entry.params),
    metadata: {
      ...template.metadata,
      ...(entry.title !== undefined ? { title: entry.title } : {}),
      ...(entry.description !== undefined
        ? { description: entry.description }
        : {}),
    },
    content: entry.content !== undefined ? entry.content : template.content,
  };
}

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

  const dynamicRoutes = options.dynamicRoutes || {};

  for (const route of filteredRoutes) {
    try {
      if (isDynamicRoute(route)) {
        const key = dynamicRouteKey(route, appDir);
        const entries = dynamicRoutes[key];

        if (!entries || entries.length === 0) {
          console.warn(
            `[next-plugin-llms] Skipping dynamic route "${key}": ` +
              `no entries provided. Add dynamicRoutes['${key}'] in your ` +
              `plugin options to expand it into per-entry .html.md routes.`,
          );
          continue;
        }

        for (const entry of entries) {
          const expandedRoute = expandDynamicRoute(route, entry);
          const markdownContent = createMarkdownContent(expandedRoute, options);
          const routeHandlerCode = createRouteHandlerContent(markdownContent);
          const routeHandlerPath = expandDynamicRoutePath(
            route.filePath,
            appDir,
            entry.params,
          );

          fs.mkdirSync(path.dirname(routeHandlerPath), { recursive: true });
          fs.writeFileSync(routeHandlerPath, routeHandlerCode, 'utf-8');

          generatedFiles.push({
            path: routeHandlerPath,
            type: 'per-page',
            size: Buffer.byteLength(routeHandlerCode, 'utf-8'),
            routeCount: 1,
          });
        }
        continue;
      }

      // Static route: original codepath unchanged.
      const markdownContent = createMarkdownContent(route, options);
      const routeHandlerCode = createRouteHandlerContent(markdownContent);
      const routeHandlerPath = getRouteHandlerPath(route, appDir);

      fs.mkdirSync(path.dirname(routeHandlerPath), { recursive: true });
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
