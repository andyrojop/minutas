import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "@resvg/resvg-js"],
};

export default nextConfig;
