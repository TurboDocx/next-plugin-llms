/**
 * Basic usage example - Zero configuration
 */

import { withLLMsTxt } from '@turbodocx/next-plugin-llms';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

// Wrap your config with withLLMsTxt
export default withLLMsTxt(nextConfig);

// That's it! The plugin will:
// 1. Scan your app/ directory
// 2. Extract metadata and content
// 3. Generate app/llms.txt/route.ts
// 4. Generate app/llms-full.txt/route.ts
