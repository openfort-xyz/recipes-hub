// Solana mainnet mints. Ondo Global Markets lists every token at https://jup.ag/tokens/ondo
export const USDC = {
  symbol: 'USDC',
  name: 'USD Coin',
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  decimals: 6,
}

export type Token = typeof USDC

// Ondo tokens are Token-2022 mints with 9 decimals; Jupiter creates the token account on first buy.
export const ONDO_TOKENS: Token[] = [
  {
    symbol: 'NVDAon',
    name: 'NVIDIA',
    mint: 'gEGtLTPNQ7jcg25zTetkbmF7teoDLcrfTnQfmn2ondo',
    decimals: 9,
  },
  {
    symbol: 'TSLAon',
    name: 'Tesla',
    mint: 'KeGv7bsfR4MheC1CkmnAVceoApjrkvBhHYjWb67ondo',
    decimals: 9,
  },
  {
    symbol: 'AAPLon',
    name: 'Apple',
    mint: '123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo',
    decimals: 9,
  },
  {
    symbol: 'SPYon',
    name: 'SPDR S&P 500 ETF',
    mint: 'k18WJUULWheRkSpSquYGdNNmtuE2Vbw1hpuUi92ondo',
    decimals: 9,
  },
  {
    symbol: 'QQQon',
    name: 'Invesco QQQ',
    mint: 'HrYNm6jTQ71LoFphjVKBTdAE4uja7WsmLG8VxB8ondo',
    decimals: 9,
  },
]
