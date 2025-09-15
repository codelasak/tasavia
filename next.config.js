/** @type {import('next').NextConfig} */
const nextConfig = {

  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true 
  },
  webpack: (config, { isServer }) => {
    // Ignore node-specific modules when bundling for the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        bufferutil: false,
        'utf-8-validate': false,
      };
    }

    // Exclude markdown files from being processed by webpack
    config.module.rules.push({
      test: /\.md$/,
      type: 'javascript/auto',
      loader: 'ignore-loader',
    });

    // Ignore specific warnings
    config.ignoreWarnings = [
      { module: /node_modules\/ws\/lib/ },
      { module: /node_modules\/@supabase\/realtime-js/ },
      /Critical dependency: the request of a dependency is an expression/,
    ];

    return config;
  },
};

module.exports = nextConfig;