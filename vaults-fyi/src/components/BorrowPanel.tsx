import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { erc20Abi, formatUnits, parseUnits } from 'viem'
import { useReadContract } from 'wagmi'
import { useBorrowMarkets } from '../hooks/useBorrowMarkets'
import { useExecuteAction } from '../hooks/useExecuteAction'
import {
  type BorrowAction,
  type BorrowAssetData,
  type BorrowMarket,
  explorerTxUrl,
  getBorrowAction,
  getBorrowMarketPosition,
} from '../lib/vaultsFyiBeta'
import { Card } from './Card'

const ACTIONS: BorrowAction[] = ['supply', 'borrow', 'repay', 'withdraw']

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`
}

export function BorrowPanel({ userAddress }: { userAddress: string }) {
  const queryClient = useQueryClient()
  const { data: markets, isLoading, error } = useBorrowMarkets()
  const { running, step, hashes, error: execError, execute, reset } = useExecuteAction()

  const [marketId, setMarketId] = useState<string>('')
  const [assetAddress, setAssetAddress] = useState<string>('')
  const [action, setAction] = useState<BorrowAction>('supply')
  const [amount, setAmount] = useState<string>('')
  const [preparing, setPreparing] = useState(false)
  const [prepError, setPrepError] = useState<string | null>(null)

  // Group markets by network so the (large) dropdown is navigable.
  const byNetwork = useMemo(() => {
    const groups = new Map<string, BorrowMarket[]>()
    for (const m of markets ?? []) {
      const key = m.network.name
      const arr = groups.get(key) ?? []
      arr.push(m)
      groups.set(key, arr)
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [markets])

  const market: BorrowMarket | undefined = useMemo(
    () => markets?.find((m) => m.marketId === marketId),
    [markets, marketId]
  )
  const asset: BorrowAssetData | undefined = useMemo(
    () => market?.assetsData.find((a) => a.asset.address === assetAddress),
    [market, assetAddress]
  )

  // Wallet token balance
  const { data: walletBalance } = useReadContract({
    address: asset?.asset.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    chainId: market?.network.chainId,
    query: { enabled: !!asset && !!userAddress && !!market },
  })

  // Market-level position (all assets' supplied / borrowed + health factor etc.)
  const { data: marketPosition } = useQuery({
    queryKey: ['borrowPosition', userAddress, market?.network.name, market?.marketId],
    queryFn: () => getBorrowMarketPosition(userAddress, market!.network.name, market!.marketId),
    enabled: !!market && !!userAddress,
    retry: false,
  })

  // Find the selected asset inside the market position
  const assetPosition = useMemo(
    () => marketPosition?.assets?.find((a) => a.asset.address.toLowerCase() === assetAddress.toLowerCase()),
    [marketPosition, assetAddress]
  )

  const formattedBalance =
    walletBalance != null && asset ? formatUnits(walletBalance, asset.asset.decimals) : undefined

  // Max fillable amount depends on the action:
  //   supply/borrow → wallet balance
  //   withdraw       → supplied amount
  //   repay          → min(debt, wallet balance)
  // Subtract 1 wei to avoid round-trip rounding overshoot.
  const maxAmount = useMemo(() => {
    if (action === 'supply' || action === 'borrow') return formattedBalance
    if (action === 'withdraw' && assetPosition && asset) {
      const raw = BigInt(assetPosition.suppliedNative)
      return raw > 0n ? formatUnits(raw - 1n, asset.asset.decimals) : undefined
    }
    if (action === 'repay' && assetPosition && asset) {
      const debt = BigInt(assetPosition.borrowedNative)
      const bal = walletBalance ?? 0n
      const raw = debt < bal ? debt : bal
      return raw > 0n ? formatUnits(raw - 1n, asset.asset.decimals) : undefined
    }
    return undefined
  }, [action, formattedBalance, assetPosition, walletBalance])

  async function handleSubmit() {
    if (!market || !asset) return
    setPreparing(true)
    setPrepError(null)
    reset()
    try {
      const { currentActionIndex, actions } = await getBorrowAction(
        action,
        userAddress,
        market.network.name,
        market.marketId,
        asset.asset.address,
        { amount: parseUnits(amount.replace(',', '.'), asset.asset.decimals).toString() }
      )
      await execute(currentActionIndex, actions)
      await queryClient.invalidateQueries({ queryKey: ['borrowPositions'] })
      await queryClient.invalidateQueries({ queryKey: ['borrowPosition'] })
    } catch (e) {
      setPrepError(e instanceof Error ? e.message : 'Failed to prepare transaction')
    } finally {
      setPreparing(false)
    }
  }

  return (
    <Card
      title="Borrow markets"
      subtitle="Supply collateral and borrow against it across Aave, Compound, Morpho, Spark, and more, on every network vaults.fyi supports. Beta."
    >
      {isLoading && <p className="text-sm text-neutral-500">Loading markets…</p>}
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}

      {markets && (
        <div className="space-y-3">
          <select
            value={marketId}
            onChange={(e) => {
              setMarketId(e.target.value)
              setAssetAddress('')
            }}
            className="w-full bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
          >
            <option value="">Select a market…</option>
            {byNetwork.map(([network, list]) => (
              <optgroup key={network} label={network}>
                {list.map((m) => (
                  <option key={m.marketId} value={m.marketId}>
                    {m.protocol.displayName} · {m.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {market && (
            <select
              value={assetAddress}
              onChange={(e) => setAssetAddress(e.target.value)}
              className="w-full bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
            >
              <option value="">Select an asset…</option>
              {market.assetsData.map((a) => (
                <option key={a.asset.address} value={a.asset.address}>
                  {a.asset.symbol} · supply {pct(a.supplyRate)} · borrow {pct(a.borrowRate)}
                </option>
              ))}
            </select>
          )}

          {market && asset && (
            <div className="rounded-xl bg-neutral-800 p-3 text-xs text-neutral-400 space-y-1">
              <div>
                <span className="text-white capitalize">{market.network.name}</span> · Max LTV{' '}
                <span className="text-white">{pct(asset.defaultRiskParameters.maxLtv)}</span> · Liquidation at{' '}
                <span className="text-white">{pct(asset.defaultRiskParameters.liquidationThreshold)}</span>
              </div>
              <div>
                Available liquidity{' '}
                <span className="text-white">${Number(asset.availableLiquidity.usd).toLocaleString()}</span>
              </div>
              {formattedBalance != null && (
                <div>
                  Wallet balance{' '}
                  <span className="text-white">
                    {Number(formattedBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
                    {asset.asset.symbol}
                  </span>
                </div>
              )}
              {assetPosition && BigInt(assetPosition.suppliedNative) > 0n && (
                <div>
                  Supplied{' '}
                  <span className="text-white">
                    {Number(formatUnits(BigInt(assetPosition.suppliedNative), asset.asset.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
                    {asset.asset.symbol}
                  </span>
                  {assetPosition.suppliedUsd && (
                    <span className="text-neutral-500"> (${Number(assetPosition.suppliedUsd).toLocaleString()})</span>
                  )}
                </div>
              )}
              {assetPosition && BigInt(assetPosition.borrowedNative) > 0n && (
                <div>
                  Debt{' '}
                  <span className="text-white">
                    {Number(formatUnits(BigInt(assetPosition.borrowedNative), asset.asset.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
                    {asset.asset.symbol}
                  </span>
                  {assetPosition.borrowedUsd && (
                    <span className="text-neutral-500"> (${Number(assetPosition.borrowedUsd).toLocaleString()})</span>
                  )}
                </div>
              )}
              {marketPosition?.ltv != null && (
                <div>
                  LTV <span className="text-white">{(marketPosition.ltv * 100).toFixed(2)}%</span>
                  {marketPosition.healthFactor != null && (
                    <>
                      {' '}· Health factor{' '}
                      <span className="text-white">{marketPosition.healthFactor.toFixed(2)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as BorrowAction)}
              className="bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700 capitalize"
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a} className="capitalize">
                  {a}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-neutral-800 text-white text-sm rounded-lg pl-3 pr-14 py-2 border border-neutral-700"
                placeholder={asset ? `Amount in ${asset.asset.symbol}` : 'Amount'}
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
              disabled={!asset || !amount || preparing || running}
              className="bg-white text-black font-semibold px-4 py-2 rounded-lg disabled:opacity-50 capitalize"
            >
              {preparing || running ? `${action}…${step ? ` (${step.current}/${step.total})` : ''}` : action}
            </button>
          </div>
        </div>
      )}

      {hashes.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs">
          {hashes.map((h) => {
            const url = market ? explorerTxUrl(market.network.chainId, h.hash) : null
            return (
              <li key={h.hash}>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                    {h.hash}
                  </a>
                ) : (
                  <span className="text-emerald-400">{h.hash}</span>
                )}{' '}
                <span className="text-neutral-500">({h.name})</span>
              </li>
            )
          })}
        </ul>
      )}
      {(prepError || execError) && <p className="mt-3 text-sm text-red-400">{prepError ?? execError}</p>}
    </Card>
  )
}
