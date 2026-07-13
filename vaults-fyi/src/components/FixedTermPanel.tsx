import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { erc20Abi, formatUnits, parseUnits } from 'viem'
import { useReadContract } from 'wagmi'
import { useExecuteAction } from '../hooks/useExecuteAction'
import { type FixedTermAction, getFixedTermAction, getFixedTermMarket } from '../lib/vaultsFyiBeta'
import { Card } from './Card'

const CHAIN_IDS: Record<string, number> = { base: 8453, mainnet: 1, arbitrum: 42161, optimism: 10, bsc: 56 }

export function FixedTermPanel({ userAddress }: { userAddress: string }) {
  const queryClient = useQueryClient()
  const { running, step, hashes, error: execError, execute, reset } = useExecuteAction()

  const [network, setNetwork] = useState('base')
  const [vaultId, setVaultId] = useState('0x250c15e59a7572195e248f668636723cca20a2b8') // yoUSD 24SEP2026 on Base
  const [assetAddress, setAssetAddress] = useState('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') // USDC on Base
  const [action, setAction] = useState<FixedTermAction>('swap-in')
  const [amount, setAmount] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [prepError, setPrepError] = useState<string | null>(null)

  const chainId = CHAIN_IDS[network]

  const { data: decimals } = useReadContract({
    address: assetAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'decimals',
    chainId,
    query: { enabled: !!assetAddress },
  })

  // Fetch market details to get PT token address (for swap-out balance)
  const { data: marketDetail } = useQuery({
    queryKey: ['fixedTermMarket', network, vaultId],
    queryFn: () => getFixedTermMarket(network, vaultId),
    enabled: !!vaultId,
  }) as { data: { lpToken?: { address: string; decimals: number } } | undefined }

  // Wallet balance of the input asset (swap-in)
  const { data: assetBalance } = useReadContract({
    address: assetAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    chainId,
    query: { enabled: !!assetAddress && !!userAddress },
  })

  // Wallet balance of the PT token (swap-out)
  const ptAddress = (marketDetail as any)?.lpToken?.address as string | undefined
  const ptDecimals = (marketDetail as any)?.lpToken?.decimals as number | undefined
  const { data: ptBalance } = useReadContract({
    address: ptAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    chainId,
    query: { enabled: !!ptAddress && !!userAddress },
  })

  const maxAmount = useMemo(() => {
    if (action === 'swap-in' && assetBalance != null && decimals != null)
      return formatUnits(assetBalance, decimals)
    if (action === 'swap-out' && ptBalance != null && ptDecimals != null)
      return formatUnits(ptBalance, ptDecimals)
    return undefined
  }, [action, assetBalance, decimals, ptBalance, ptDecimals])

  async function handleSubmit() {
    if (!vaultId || !assetAddress || !amount || decimals == null) return
    const isSwapOut = action === 'swap-out'
    const txAsset = isSwapOut && ptAddress ? ptAddress : assetAddress
    const txDecimals = isSwapOut && ptDecimals != null ? ptDecimals : decimals
    setPreparing(true)
    setPrepError(null)
    reset()
    try {
      const { currentActionIndex, actions } = await getFixedTermAction(action, userAddress, network, vaultId, {
        assetAddress: txAsset,
        amount: parseUnits(amount.replace(',', '.'), txDecimals).toString(),
      })
      await execute(currentActionIndex, actions)
      await queryClient.invalidateQueries({ queryKey: ['borrowPositions'] })
    } catch (e) {
      setPrepError(e instanceof Error ? e.message : 'Failed to prepare transaction')
    } finally {
      setPreparing(false)
    }
  }

  return (
    <Card
      title="Fixed-term (Pendle)"
      subtitle="Swap into a Pendle principal token for a fixed rate and swap back out."
    >

      <div className="space-y-3">
        <div className="flex gap-3">
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-32 bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
          >
            <option value="base">Base</option>
            <option value="mainnet">Ethereum</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="optimism">Optimism</option>
            <option value="bsc">BSC</option>
          </select>
          <input
            value={vaultId}
            onChange={(e) => setVaultId(e.target.value)}
            className="flex-1 bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
            placeholder="Fixed-term vaultId"
          />
        </div>
        <input
          value={assetAddress}
          onChange={(e) => setAssetAddress(e.target.value)}
          className="w-full bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
          placeholder="Asset address"
        />
        <div className="flex items-center gap-3">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as FixedTermAction)}
            className="bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
          >
            <option value="swap-in">swap-in (asset → PT)</option>
            <option value="swap-out">swap-out (PT → asset)</option>
          </select>
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-neutral-800 text-white text-sm rounded-lg pl-3 pr-14 py-2 border border-neutral-700"
              placeholder="Amount"
            />
            {maxAmount && (
              <button
                type="button"
                onClick={() => setAmount(maxAmount)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
              >
                MAX
              </button>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!vaultId || !assetAddress || !amount || preparing || running}
            className="bg-white text-black font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {preparing || running ? `Swapping…${step ? ` (${step.current}/${step.total})` : ''}` : 'Swap'}
          </button>
        </div>
      </div>

      {hashes.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs">
          {hashes.map((h) => (
            <li key={h.hash}>
              <span className="text-emerald-400">{h.hash}</span> <span className="text-neutral-500">({h.name})</span>
            </li>
          ))}
        </ul>
      )}
      {(prepError || execError) && <p className="mt-3 text-sm text-red-400">{prepError ?? execError}</p>}
    </Card>
  )
}
