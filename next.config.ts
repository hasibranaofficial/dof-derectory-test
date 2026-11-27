import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/dof-derectory-test",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
