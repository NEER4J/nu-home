import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    domains: ['boiler-sure.co.uk', 'stewart-temp-solutions.com', 'growenergy.com.au', 'nu-home.co.uk', 'www.mcinnesgroup.co.uk', 'boiler-image.b-cdn.net', "origin-gph.com", "danlec.uk"],
  },
  
};



export default nextConfig;

