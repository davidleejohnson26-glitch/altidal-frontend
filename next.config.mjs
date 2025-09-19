
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    serverActions: { bodySizeLimit: '2mb' },
  },
};

export default nextConfig;
