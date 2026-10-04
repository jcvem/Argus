/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["firebase", "@firebase/app", "@firebase/auth"],
};

export default nextConfig;
