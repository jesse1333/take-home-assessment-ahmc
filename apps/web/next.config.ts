import type { NextConfig } from "next";

/**
 * Monorepo: `apps/api` depends on `pdf-parse` → `pdfjs-dist` → optional `@napi-rs/canvas`.
 * Next.js file tracing can pull those into the Vercel serverless bundle even though the web
 * app never imports them. Canvas is native and breaks Lambda (missing module / wrong arch).
 * Exclude API-only PDF stacks from the web deployment trace.
 */
const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "**/node_modules/pdf-parse/**/*",
      "**/node_modules/pdfjs-dist/**/*",
      "**/node_modules/@napi-rs/canvas/**/*",
      "**/node_modules/@napi-rs/canvas-*/**/*",
    ],
  },
};

export default nextConfig;
