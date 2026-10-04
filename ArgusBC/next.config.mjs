/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  transpilePackages: ["firebase", "@firebase/app", "@firebase/auth"],
};

export default nextConfig;
