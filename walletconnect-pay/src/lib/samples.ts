import type { PayAmount, PaymentOption, PaymentOptionsResponse } from '@walletconnect/pay'

// Representative sample payments used to preview the options screen without a live merchant link.
// WalletConnect Pay links are generated per-payment via the dashboard POS tool, so there is no
// stable public link to hard-code; these render the same UI the real `getPaymentOptions` response
// drives. Samples are display-only — paying still requires a real link.

export interface SampleMerchant {
  id: string
  emoji: string
  label: string
  response: PaymentOptionsResponse
}

function amount(symbol: string, name: string, decimals: number, value: string, networkName: string): PayAmount {
  return { unit: symbol.toLowerCase(), value, display: { assetSymbol: symbol, assetName: name, decimals, networkName } }
}

function option(id: string, chainId: number, amt: PayAmount, etaS: number): PaymentOption {
  return { id, account: `eip155:${chainId}:0x0000000000000000000000000000000000000000`, amount: amt, etaS, actions: [] }
}

export const SAMPLE_MERCHANTS: SampleMerchant[] = [
  {
    id: 'coffee',
    emoji: '☕',
    label: 'Reown Coffee · 4.50 USDC',
    response: {
      paymentId: 'sample-coffee',
      info: {
        status: 'requires_action',
        amount: amount('USDC', 'USD Coin', 6, '4500000', 'Base'),
        expiresAt: 0,
        merchant: { name: 'Reown Coffee' },
      },
      options: [
        option('coffee-base', 8453, amount('USDC', 'USD Coin', 6, '4500000', 'Base'), 6),
        option('coffee-polygon', 137, amount('USDC', 'USD Coin', 6, '4500000', 'Polygon'), 9),
      ],
    },
  },
  {
    id: 'store',
    emoji: '🛍️',
    label: 'Acme Store · 25.00 USDC',
    response: {
      paymentId: 'sample-store',
      info: {
        status: 'requires_action',
        amount: amount('USDC', 'USD Coin', 6, '25000000', 'Arbitrum'),
        expiresAt: 0,
        merchant: { name: 'Acme Store' },
      },
      options: [
        option('store-arbitrum', 42161, amount('USDC', 'USD Coin', 6, '25000000', 'Arbitrum'), 5),
        option('store-optimism', 10, amount('USDT', 'Tether USD', 6, '25000000', 'Optimism'), 7),
      ],
    },
  },
]
