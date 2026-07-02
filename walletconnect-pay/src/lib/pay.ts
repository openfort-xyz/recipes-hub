import { WalletConnectPay } from '@walletconnect/pay'

export type PayClient = InstanceType<typeof WalletConnectPay>

// Minimal EIP-1193 surface. The Openfort embedded wallet exposes its provider through the
// wagmi connector; WalletConnect Pay hands back raw wallet RPC requests, so we forward them
// to this `request` method verbatim instead of going through typed viem actions.
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>
}

let client: PayClient | null = null

// Single shared Pay client. `appId` is the WalletConnect project id; `apiKey` is the Pay
// gateway key. Both come from the WalletConnect dashboard.
export function getPayClient(): PayClient {
  if (!client) {
    client = new WalletConnectPay({
      appId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || undefined,
      apiKey: import.meta.env.VITE_WALLETCONNECT_PAY_API_KEY || undefined,
    })
  }
  return client
}
