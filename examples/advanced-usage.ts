/**
 * Advanced usage example - Full configuration
 */

import { withLLMsTxt } from '@turbodocx/next-plugin-llms';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Your other Next.js config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.turbodocx.com',
      },
    ],
  },

  async redirects() {
    return [
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true,
      },
    ];
  },
};

// Wrap with plugin and provide options
export default withLLMsTxt(nextConfig, {
  // Site information
  title: 'TurboDocx',
  description: 'AI-powered document automation platform that helps teams create, manage, and sign documents faster.',
  siteUrl: 'https://www.turbodocx.com',

  // Content sources - organize by section
  sources: [
    {
      section: 'Products',
      pattern: 'app/products/**',
      priority: 'high',
      description: 'Core product offerings'
    },
    {
      section: 'Use Cases',
      pattern: 'app/use-cases/**',
      priority: 'high',
      description: 'Industry-specific solutions'
    },
    {
      section: 'Blog',
      pattern: 'app/blog/**',
      priority: 'medium',
      description: 'Guides and best practices'
    },
    {
      section: 'Newsroom',
      pattern: 'app/newsroom/**',
      priority: 'medium',
      description: 'Company announcements and updates'
    },
  ],

  // Custom sections (external links, open source, etc.)
  customSections: [
    {
      title: 'Open Source',
      description: 'Our open source contributions to the developer community',
      items: [
        {
          title: '@turbodocx/html-to-docx',
          url: 'https://github.com/TurboDocx/html-to-docx',
          description: 'Convert HTML to DOCX - 26,000+ npm downloads'
        },
        {
          title: 'GitHub Organization',
          url: 'https://github.com/TurboDocx',
          description: 'All our open source projects'
        },
        {
          title: 'npm Packages',
          url: 'https://www.npmjs.com/~turbodocx',
          description: 'Published packages on npm'
        }
      ]
    },
    {
      title: 'Documentation',
      description: 'Technical documentation and API references',
      items: [
        {
          title: 'Getting Started',
          url: 'https://docs.turbodocx.com',
          description: 'Complete guides and tutorials'
        },
        {
          title: 'API Reference',
          url: 'https://docs.turbodocx.com/API',
          description: 'REST API documentation'
        },
        {
          title: 'Integration Guides',
          url: 'https://docs.turbodocx.com/docs/integrations',
          description: 'Connect with Salesforce, Wrike, ConnectWise, and more'
        }
      ]
    },
    {
      title: 'Resources',
      items: [
        {
          title: 'Pricing',
          url: 'https://www.turbodocx.com/pricing',
          description: 'Free tier and paid plans from $10/user'
        },
        {
          title: 'Demo',
          url: 'https://www.turbodocx.com/demo',
          description: 'Schedule a personalized demo'
        }
      ]
    }
  ],

  // Exclude specific routes
  excludePatterns: [
    '**/admin/**',
    '**/internal/**',
    '**/thank-you*',
    '**/*promo*'
  ],

  // Content processing options
  contentOptions: {
    stripJsx: true,
    preserveMarkdown: true,
    includeMetadata: true,
    maxContentLength: 50000,
    removeDuplicateHeadings: false
  },

  // Output configuration
  outputType: 'route-handler', // or 'static'

  // Callback when files are generated
  onGenerate: (files) => {
    console.log('✅ Generated LLM files:');
    files.forEach((file) => {
      console.log(`   - ${file.type}: ${file.routeCount} routes`);
    });
  }
});
