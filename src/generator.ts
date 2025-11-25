/**
 * Generator for llms.txt and llms-full.txt files
 * Follows the llmstxt.org standard
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  PluginOptions,
  RouteInfo,
  ContentItem,
  CustomSection,
  GeneratedFile,
} from './types';
import { getBestTitle, getBestDescription } from './metadata-extractor';
import { formatContentForLLM } from './content-processor';

/**
 * Generate llms.txt file
 */
export function generateLLMsTxt(
  routes: RouteInfo[],
  options: PluginOptions
): string {
  const parts: string[] = [];

  // H1: Project name
  parts.push(`# ${options.title || 'Documentation'}`);
  parts.push('');

  // Blockquote: Description
  if (options.description) {
    parts.push(`> ${options.description}`);
    parts.push('');
  }

  // Group routes by section
  const sections = groupBySection(routes, options);

  // Add sections
  for (const [sectionTitle, sectionRoutes] of sections) {
    parts.push(`## ${sectionTitle}`);
    parts.push('');

    for (const route of sectionRoutes) {
      const title = getBestTitle(route);
      const description = getBestDescription(route);
      const url = buildUrl(route.urlPath, options.siteUrl);

      if (description) {
        parts.push(`- [${title}](${url}): ${description}`);
      } else {
        parts.push(`- [${title}](${url})`);
      }
    }

    parts.push('');
  }

  // Add custom sections
  if (options.customSections) {
    for (const section of options.customSections) {
      parts.push(`## ${section.title}`);
      parts.push('');

      if (section.description) {
        parts.push(section.description);
        parts.push('');
      }

      for (const item of section.items) {
        if (item.description) {
          parts.push(`- [${item.title}](${item.url}): ${item.description}`);
        } else {
          parts.push(`- [${item.title}](${item.url})`);
        }
      }

      parts.push('');
    }
  }

  return parts.join('\n');
}

/**
 * Generate llms-full.txt file
 */
export function generateLLMsFullTxt(
  routes: RouteInfo[],
  options: PluginOptions
): string {
  const parts: string[] = [];

  // Header
  parts.push(`# ${options.title || 'Documentation'}`);
  parts.push('');

  if (options.description) {
    parts.push(`> ${options.description}`);
    parts.push('');
  }

  parts.push(
    'This file contains all documentation content in a single document following the llmstxt.org standard.'
  );
  parts.push('');
  parts.push('---');
  parts.push('');

  // Group routes by section
  const sections = groupBySection(routes, options);

  // Add full content for each section
  for (const [sectionTitle, sectionRoutes] of sections) {
    parts.push(`## ${sectionTitle}`);
    parts.push('');

    for (const route of sectionRoutes) {
      const title = getBestTitle(route);
      const url = buildUrl(route.urlPath, options.siteUrl);

      parts.push(`### ${title}`);
      parts.push('');
      parts.push(`URL: ${url}`);
      parts.push('');

      // Add description if available
      const description = getBestDescription(route);
      if (description) {
        parts.push(description);
        parts.push('');
      }

      // Add full content
      if (route.content) {
        const formattedContent = formatContentForLLM(route);
        parts.push(formattedContent);
        parts.push('');
      }

      parts.push('---');
      parts.push('');
    }
  }

  // Add custom sections
  if (options.customSections) {
    for (const section of options.customSections) {
      parts.push(`## ${section.title}`);
      parts.push('');

      if (section.description) {
        parts.push(section.description);
        parts.push('');
      }

      for (const item of section.items) {
        parts.push(`### ${item.title}`);
        parts.push('');
        parts.push(`URL: ${item.url}`);
        parts.push('');

        if (item.description) {
          parts.push(item.description);
          parts.push('');
        }

        parts.push('---');
        parts.push('');
      }
    }
  }

  return parts.join('\n');
}

/**
 * Group routes by section
 */
function groupBySection(
  routes: RouteInfo[],
  options: PluginOptions
): Map<string, RouteInfo[]> {
  const sections = new Map<string, RouteInfo[]>();

  // Create sections from content sources
  if (options.sources) {
    for (const source of options.sources) {
      sections.set(source.section, []);
    }
  }

  // Default section for ungrouped routes
  if (!sections.has('Pages')) {
    sections.set('Pages', []);
  }

  // Assign routes to sections
  for (const route of routes) {
    let assigned = false;

    if (options.sources) {
      for (const source of options.sources) {
        // Simple path matching (could use minimatch for more complex patterns)
        if (route.filePath.includes(source.pattern.replace('**', ''))) {
          const sectionRoutes = sections.get(source.section) || [];
          sectionRoutes.push(route);
          sections.set(source.section, sectionRoutes);
          assigned = true;
          break;
        }
      }
    }

    // Add to default section if not assigned
    if (!assigned) {
      const defaultRoutes = sections.get('Pages') || [];
      defaultRoutes.push(route);
      sections.set('Pages', defaultRoutes);
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
 * Build full URL from path
 */
function buildUrl(urlPath: string, siteUrl?: string): string {
  if (!siteUrl) {
    return urlPath;
  }

  // Remove trailing slash from site URL
  const baseUrl = siteUrl.replace(/\/$/, '');

  // Ensure path starts with /
  const path = urlPath.startsWith('/') ? urlPath : '/' + urlPath;

  return baseUrl + path;
}

/**
 * Generate route handler file content
 */
export function generateRouteHandlerFile(content: string): string {
  return `export const dynamic = 'force-static';

export function GET() {
  const markdown = \`${content.replace(/`/g, '\\`')}\`;

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
`;
}

/**
 * Write generated files to disk
 */
export async function writeGeneratedFiles(
  routes: RouteInfo[],
  options: PluginOptions
): Promise<GeneratedFile[]> {
  const generatedFiles: GeneratedFile[] = [];

  // Generate llms.txt
  if (options.generateLLMsTxt !== false) {
    const content = generateLLMsTxt(routes, options);
    const filePath = await writeFile(
      content,
      options,
      'llms.txt',
      options.outputPath?.llmsTxt || 'app/llms.txt/route.ts'
    );

    generatedFiles.push({
      path: filePath,
      type: 'llms.txt',
      size: content.length,
      routeCount: routes.length,
    });
  }

  // Generate llms-full.txt
  if (options.generateLLMsFullTxt !== false) {
    const content = generateLLMsFullTxt(routes, options);
    const filePath = await writeFile(
      content,
      options,
      'llms-full.txt',
      options.outputPath?.llmsFullTxt || 'app/llms-full.txt/route.ts'
    );

    generatedFiles.push({
      path: filePath,
      type: 'llms-full.txt',
      size: content.length,
      routeCount: routes.length,
    });
  }

  // Generate custom files
  if (options.customFiles) {
    for (const customFile of options.customFiles) {
      const filteredRoutes = filterRoutesForCustomFile(routes, customFile);

      const content = customFile.fullContent
        ? generateLLMsFullTxt(filteredRoutes, {
            ...options,
            title: customFile.title,
            description: customFile.description,
          })
        : generateLLMsTxt(filteredRoutes, {
            ...options,
            title: customFile.title,
            description: customFile.description,
          });

      const fileName = customFile.filename.replace('.txt', '');
      const filePath = await writeFile(
        content,
        options,
        customFile.filename,
        `app/${fileName}/route.ts`
      );

      generatedFiles.push({
        path: filePath,
        type: 'custom',
        size: content.length,
        routeCount: filteredRoutes.length,
      });
    }
  }

  // Generate per-page markdown files
  if (options.generatePerPageMarkdown) {
    const { generatePerPageRoutes } = await import('./per-page-generator');
    const perPageFiles = await generatePerPageRoutes(routes, options);
    generatedFiles.push(...perPageFiles);
  }

  return generatedFiles;
}

/**
 * Write a single file
 */
async function writeFile(
  content: string,
  options: PluginOptions,
  filename: string,
  defaultPath: string
): Promise<string> {
  const outputType = options.outputType || 'route-handler';
  let filePath: string;
  let fileContent: string;

  if (outputType === 'static') {
    // Write to public directory
    filePath = path.join(process.cwd(), 'public', filename);
    fileContent = content;
  } else {
    // Write as route handler
    filePath = path.join(process.cwd(), defaultPath);
    fileContent = generateRouteHandlerFile(content);
  }

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(filePath, fileContent, 'utf-8');

  return filePath;
}

/**
 * Filter routes for a custom file
 */
function filterRoutesForCustomFile(
  routes: RouteInfo[],
  customFile: any
): RouteInfo[] {
  // Simple filtering based on file path
  return routes.filter((route) => {
    return customFile.includePatterns.some((pattern: string) => {
      return route.filePath.includes(pattern.replace('**', ''));
    });
  });
}
