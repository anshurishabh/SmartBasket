import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow hot module replacement from your local network IP
  allowedDevOrigins: ["10.215.237.208", "localhost:3000"],
};

export default nextConfig;