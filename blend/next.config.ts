import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pin the workspace root to this recipe so a lockfile elsewhere on the machine
  // is not mistaken for the project root.
  turbopack: { root: import.meta.dirname },
  // Both SDKs are only imported from server-side route handlers. Keep them external so
  // Next does not try to bundle their Node dependencies into the server output.
  serverExternalPackages: ['@openfort/openfort-node', '@blend-money/node'],
}

export default nextConfig
