const resourceUrl =
  import.meta.env.VITE_X402_RESOURCE_URL ??
  'http://localhost:3007/api/protected-content'

export function getApiBaseUrl(): string {
  try {
    return new URL(resourceUrl).origin
  } catch {
    return 'http://localhost:3007'
  }
}
