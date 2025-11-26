/**
 * @turbodocx/next-plugin-llms
 * Next.js plugin for generating LLM-friendly documentation
 */

import type { NextConfig, WebpackConfigContext, PluginOptions, WithLLMsTxt } from './types';
import { scanAppDirectory, sortRoutesByPriority } from './scanner';
import { enrichRoutesWithMetadata } from './metadata-extractor';
import { enrichRoutesWithContent } from './content-processor';
import { writeGeneratedFiles } from './generator';

/**
 * Default plugin options
 */
const defaultOptions: PluginOptions = {
  enabled: true,
  generateLLMsTxt: true,
  generateLLMsFullTxt: true,
  generatePerPageMarkdown: true,
  appDir: 'app',
  includePatterns: ['**/*.tsx', '**/*.ts'],
  excludePatterns: ['**/api/**', '**/_*.tsx', '**/route.ts'],
  outputType: 'route-handler',
  contentOptions: {
    stripJsx: true,
    preserveMarkdown: true,
    includeMetadata: true,
    maxContentLength: 50000,
    removeDuplicateHeadings: false,
  },
  perPageOptions: {
    outputType: 'route-handler',
    includeMetadata: true,
  },
};

/**
 * Main plugin function
 * Wraps Next.js config and adds LLM generation functionality
 */
export const withLLMsTxt: WithLLMsTxt = (
  nextConfig: NextConfig = {},
  options: PluginOptions = {}
): NextConfig => {
  const mergedOptions: PluginOptions = {
    ...defaultOptions,
    ...options,
    contentOptions: {
      ...defaultOptions.contentOptions,
      ...options.contentOptions,
    },
  };

  // If plugin is disabled, return original config
  if (mergedOptions.enabled === false) {
    return nextConfig;
  }

  // Wrap the webpack config
  const originalWebpack = nextConfig.webpack;

  return {
    ...nextConfig,
    webpack(config: unknown, context: WebpackConfigContext) {
      // Call original webpack config if it exists
      if (originalWebpack) {
        config = originalWebpack(config, context);
      }

      // Only run on server build
      if (context.isServer) {
        // Add plugin to generate LLM files
        const webpackConfig = config as { plugins?: unknown[] };
        webpackConfig.plugins = webpackConfig.plugins || [];
        webpackConfig.plugins.push(new LLMsTxtWebpackPlugin(mergedOptions));
      }

      return config;
    },
  };
};

/**
 * Webpack plugin for LLM generation
 */
class LLMsTxtWebpackPlugin {
  private options: PluginOptions;
  private hasRun: boolean = false;

  constructor(options: PluginOptions) {
    this.options = options;
  }

  apply(compiler: any) {
    const isProduction = compiler.options.mode === 'production';
    const isDevelopment = compiler.options.mode === 'development';

    compiler.hooks.beforeCompile.tapAsync(
      'LLMsTxtWebpackPlugin',
      async (_: any, callback: () => void) => {
        // In production: Always generate (but only once per build)
        // In development: Only generate on first run
        if (this.hasRun) {
          callback();
          return;
        }

        // Skip in dev mode if user wants to (performance optimization)
        if (isDevelopment && this.options.skipInDevelopment) {
          console.log('⏭️  Skipping LLM file generation in development mode (skipInDevelopment: true)');
          this.hasRun = true;
          callback();
          return;
        }

        this.hasRun = true;

        try {
          await generateLLMFiles(this.options);
        } catch (error) {
          console.error('Error generating LLM files:', error);
        }

        callback();
      }
    );
  }
}

/**
 * Generate LLM files
 * Can be called directly for testing or manual generation
 */
export async function generateLLMFiles(options: PluginOptions = defaultOptions) {
  console.log('🤖 Generating LLM-friendly documentation...');

  const startTime = Date.now();

  try {
    // Step 1: Scan app directory
    console.log(`📁 Scanning ${options.appDir || 'app'} directory...`);
    let routes = await scanAppDirectory(options.appDir || 'app', options);
    console.log(`   Found ${routes.length} routes`);

    if (routes.length === 0) {
      console.warn('⚠️  No routes found. Skipping LLM file generation.');
      return;
    }

    // Step 2: Extract metadata
    console.log('📋 Extracting metadata from layouts...');
    routes = await enrichRoutesWithMetadata(routes);

    // Step 3: Extract content
    console.log('📝 Extracting content from pages...');
    routes = await enrichRoutesWithContent(routes, options.contentOptions);

    // Step 4: Sort by priority
    routes = sortRoutesByPriority(routes, options);

    // Step 5: Generate files
    console.log('✍️  Generating LLM files...');
    const generatedFiles = await writeGeneratedFiles(routes, options);

    // Report results
    const duration = Date.now() - startTime;
    console.log('✅ LLM files generated successfully!');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Routes processed: ${routes.length}`);
    console.log(`   Files generated: ${generatedFiles.length}`);

    generatedFiles.forEach((file) => {
      const sizeKB = (file.size / 1024).toFixed(2);
      console.log(`   - ${file.type}: ${file.path} (${sizeKB}KB, ${file.routeCount} routes)`);
    });

    // Call onGenerate callback if provided
    if (options.onGenerate) {
      options.onGenerate(generatedFiles);
    }
  } catch (error) {
    console.error('❌ Error generating LLM files:', error);
    throw error;
  }
}

// Export types
export type {
  PluginOptions,
  PerPageOptions,
  ContentSource,
  CustomSection,
  CustomLLMFile,
  RouteInfo,
  RouteMetadata,
  ContentItem,
  GeneratedFile,
} from './types';

// Default export
export default withLLMsTxt;
