/**
 * TypeScript type definitions for next-plugin-llms
 */

import type { NextConfig } from 'next';

/**
 * Plugin configuration options
 */
export interface PluginOptions {
  /**
   * Enable or disable the plugin
   * @default true
   */
  enabled?: boolean;

  /**
   * Generate llms.txt file
   * @default true
   */
  generateLLMsTxt?: boolean;

  /**
   * Generate llms-full.txt file with complete content
   * @default true
   */
  generateLLMsFullTxt?: boolean;

  /**
   * Generate per-page markdown endpoints (.html.md)
   * @default true
   */
  generatePerPageMarkdown?: boolean;

  /**
   * Per-page markdown generation options
   */
  perPageOptions?: PerPageOptions;

  /**
   * Site title (fallback to Next.js metadata)
   */
  title?: string;

  /**
   * Site description (fallback to Next.js metadata)
   */
  description?: string;

  /**
   * Base URL of the site
   * @example 'https://www.turbodocx.com'
   */
  siteUrl?: string;

  /**
   * Path to the app directory
   * @default 'app'
   */
  appDir?: string;

  /**
   * Glob patterns for files to include
   * @default ['**\/*.tsx', '**\/*.ts']
   */
  includePatterns?: string[];

  /**
   * Glob patterns for files/directories to exclude
   * @default ['**\/api/**', '**\/_*.tsx', '**\/route.ts']
   */
  excludePatterns?: string[];

  /**
   * Content sources with section grouping
   */
  sources?: ContentSource[];

  /**
   * Custom sections (e.g., external links, open source projects)
   */
  customSections?: CustomSection[];

  /**
   * Output type: route-handler or static file
   * @default 'route-handler'
   */
  outputType?: 'route-handler' | 'static';

  /**
   * Output paths for generated files
   */
  outputPath?: {
    llmsTxt?: string;
    llmsFullTxt?: string;
  };

  /**
   * Content processing options
   */
  contentOptions?: ContentOptions;

  /**
   * Custom LLM files (similar to Docusaurus plugin)
   */
  customFiles?: CustomLLMFile[];

  /**
   * Callback when files are generated
   */
  onGenerate?: (files: GeneratedFile[]) => void;
}

/**
 * Content source configuration
 */
export interface ContentSource {
  /**
   * Section title in llms.txt
   */
  section: string;

  /**
   * Glob pattern to match files
   * @example 'app/products/**'
   */
  pattern: string;

  /**
   * Priority for ordering (high, medium, low)
   * @default 'medium'
   */
  priority?: 'high' | 'medium' | 'low';

  /**
   * Description for this section
   */
  description?: string;
}

/**
 * Custom section with external or static content
 */
export interface CustomSection {
  /**
   * Section title
   */
  title: string;

  /**
   * Items in this section
   */
  items: CustomSectionItem[];

  /**
   * Optional description
   */
  description?: string;
}

/**
 * Item in a custom section
 */
export interface CustomSectionItem {
  /**
   * Item title
   */
  title: string;

  /**
   * URL (can be external)
   */
  url: string;

  /**
   * Optional description
   */
  description?: string;
}

/**
 * Per-page markdown generation options
 */
export interface PerPageOptions {
  /**
   * Output as route handlers or static files
   * @default 'route-handler'
   */
  outputType?: 'route-handler' | 'static';

  /**
   * Include page metadata in markdown frontmatter
   * @default true
   */
  includeMetadata?: boolean;

  /**
   * Patterns for pages to include
   * If not specified, all pages are included
   */
  includePatterns?: string[];

  /**
   * Patterns for pages to exclude
   * Applied in addition to global excludePatterns
   */
  excludePatterns?: string[];
}

/**
 * Content processing options
 */
export interface ContentOptions {
  /**
   * Strip JSX tags from content
   * @default true
   */
  stripJsx?: boolean;

  /**
   * Preserve markdown-like formatting
   * @default true
   */
  preserveMarkdown?: boolean;

  /**
   * Include metadata in output
   * @default true
   */
  includeMetadata?: boolean;

  /**
   * Maximum content length per page (characters)
   * @default 50000
   */
  maxContentLength?: number;

  /**
   * Remove duplicate headings
   * @default false
   */
  removeDuplicateHeadings?: boolean;
}

/**
 * Custom LLM file configuration
 */
export interface CustomLLMFile {
  /**
   * Output filename
   * @example 'llms-products.txt'
   */
  filename: string;

  /**
   * File title
   */
  title: string;

  /**
   * File description
   */
  description: string;

  /**
   * Glob patterns to include
   */
  includePatterns: string[];

  /**
   * Whether to include full content (like llms-full.txt)
   * @default false
   */
  fullContent?: boolean;

  /**
   * Glob patterns to exclude (in addition to global excludePatterns)
   */
  excludePatterns?: string[];
}

/**
 * Generated file information
 */
export interface GeneratedFile {
  /**
   * File path
   */
  path: string;

  /**
   * File type
   */
  type: 'llms.txt' | 'llms-full.txt' | 'per-page' | 'custom';

  /**
   * File size in bytes
   */
  size: number;

  /**
   * Number of routes/pages included
   */
  routeCount: number;
}

/**
 * Discovered route information
 */
export interface RouteInfo {
  /**
   * File system path
   */
  filePath: string;

  /**
   * URL path
   */
  urlPath: string;

  /**
   * Route type
   */
  type: 'page' | 'layout' | 'route';

  /**
   * Metadata extracted from layout
   */
  metadata?: RouteMetadata;

  /**
   * Content extracted from page
   */
  content?: string;

  /**
   * Heading structure
   */
  headings?: Heading[];
}

/**
 * Route metadata
 */
export interface RouteMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    type?: string;
  };
}

/**
 * Heading structure
 */
export interface Heading {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  id?: string;
}

/**
 * Content item for generation
 */
export interface ContentItem {
  title: string;
  url: string;
  description?: string;
  content?: string;
  section?: string;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Plugin wrapper function signature
 */
export type WithLLMsTxt = (
  nextConfig: NextConfig,
  options?: PluginOptions
) => NextConfig;
