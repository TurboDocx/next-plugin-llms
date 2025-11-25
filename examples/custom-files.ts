/**
 * Example with custom LLM files for specific sections
 */

import { withLLMsTxt } from '@turbodocx/next-plugin-llms';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withLLMsTxt(nextConfig, {
  title: 'TurboDocx',
  description: 'AI-powered document automation',
  siteUrl: 'https://www.turbodocx.com',

  // Generate standard files
  generateLLMsTxt: true,
  generateLLMsFullTxt: true,

  // Generate additional custom LLM files
  customFiles: [
    {
      // Product-specific file
      filename: 'llms-products.txt',
      title: 'TurboDocx Products',
      description: 'Complete product documentation including features, pricing, and integrations',
      includePatterns: ['app/products/**'],
      fullContent: true, // Include full content like llms-full.txt
    },
    {
      // Developer-focused file
      filename: 'llms-developers.txt',
      title: 'TurboDocx for Developers',
      description: 'API documentation, integration guides, and code examples',
      includePatterns: [
        'app/use-cases/developers/**',
        'app/products/turbodocx-templating/**'
      ],
      fullContent: true,
    },
    {
      // Blog/content marketing file
      filename: 'llms-content.txt',
      title: 'TurboDocx Blog & Newsroom',
      description: 'Articles, guides, and company updates',
      includePatterns: [
        'app/blog/**',
        'app/newsroom/**'
      ],
      fullContent: false, // Just links, not full content
    },
    {
      // Sales-focused file
      filename: 'llms-sales.txt',
      title: 'TurboDocx for Sales Teams',
      description: 'Solutions for sales professionals',
      includePatterns: [
        'app/use-cases/sales-teams/**',
        'app/products/**'
      ],
      excludePatterns: [
        '**/developers/**'
      ],
      fullContent: true,
    }
  ],

  // Main content organization
  sources: [
    {
      section: 'Products',
      pattern: 'app/products/**',
      priority: 'high'
    },
    {
      section: 'Use Cases',
      pattern: 'app/use-cases/**',
      priority: 'high'
    },
    {
      section: 'Content',
      pattern: 'app/blog/**',
      priority: 'medium'
    }
  ],

  customSections: [
    {
      title: 'Documentation',
      items: [
        {
          title: 'API Reference',
          url: 'https://docs.turbodocx.com/API'
        }
      ]
    }
  ],

  onGenerate: (files) => {
    console.log(`\n📚 Generated ${files.length} LLM files:`);
    files.forEach((file) => {
      const sizeKB = (file.size / 1024).toFixed(2);
      console.log(`   ${file.type.padEnd(20)} ${file.routeCount} routes  ${sizeKB}KB`);
    });
    console.log('');
  }
});

// This configuration will generate:
// - app/llms.txt/route.ts (all content, links only)
// - app/llms-full.txt/route.ts (all content, full text)
// - app/llms-products/route.ts (products only, full content)
// - app/llms-developers/route.ts (developer content, full content)
// - app/llms-content/route.ts (blog/news, links only)
// - app/llms-sales/route.ts (sales content, full content)
