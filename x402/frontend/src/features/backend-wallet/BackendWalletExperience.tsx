import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPublicClient, formatUnits, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import type { BalanceClient } from '../../integrations/x402'
import { getUSDCBalance } from '../../integrations/x402'
import { getApiBaseUrl } from './getApiBaseUrl'

const DEFAULT_AMOUNT_USDC = 0.1
const USDC_DECIMALS = 6

const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org'
const USDC_FAUCET_URL = 'https://faucet.circle.com/'

interface BackendWalletStatus {
  configured: boolean
  /** Payer: backend wallet (fund with USDC + ETH for gas) */
  payerAddress?: string
  /** Recipient: receives USDC (from PAY_TO_ADDRESS) */
  payToAddress?: string
  network?: string
  maxAmountRequired?: string
}

interface CreatedWallet {
  id: string
  address: string
}

function getExplorerAddressUrl(address: string, network?: string): string {
  const base = network === 'base' ? 'https://basescan.org' : BASE_SEPOLIA_EXPLORER
  return `${base}/address/${address}`
}

function getExplorerTxUrl(txHash: string, network?: string): string {
  const base = network === 'base' ? 'https://basescan.org' : BASE_SEPOLIA_EXPLORER
  return `${base}/tx/${txHash}`
}

function AddressRow({
  label,
  value,
  copyValue,
  explorerUrl,
  copied,
  copyLabel,
  onCopy,
}: {
  label: string
  value: string
  copyValue?: string
  explorerUrl?: string
  copied: string | null
  copyLabel: string
  onCopy: (text: string, label: string) => void
}) {
  const toCopy = copyValue ?? value
  return (
    <div>
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <code className="flex-1 truncate text-sm">{value}</code>
        <button
          type="button"
          onClick={() => onCopy(toCopy, copyLabel)}
          className="rounded bg-zinc-600 px-2 py-1 text-sm hover:bg-zinc-500"
        >
          {copied === copyLabel ? 'Copied' : 'Copy'}
        </button>
        {explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-zinc-600 px-2 py-1 text-sm hover:bg-zinc-500"
          >
            Explorer
          </a>
        ) : null}
      </div>
    </div>
  )
}

type PaymentResult = {
  success: boolean
  message?: string
  content?: unknown
  transactionHash?: string
}

async function runBackendWalletPayment(baseUrl: string): Promise<PaymentResult> {
  const protectedContentUrl = `${baseUrl}/api/protected-content`
  const first = await fetch(protectedContentUrl)
  if (first.status !== 402) {
    throw new Error(
      first.status === 200
        ? 'Already unlocked (no payment required)'
        : `Unexpected status ${first.status}`,
    )
  }

  const signRes = await fetch(`${baseUrl}/api/backend-wallet/test-payment`)
  const signData = (await signRes.json()) as
    | { paymentHeader: string }
    | { success: true; transactionHash: string; message?: string; content?: unknown }
    | { error?: string }
  if (!signRes.ok) {
    const err = signData as { error?: string; details?: string }
    throw new Error(err.details ?? err.error ?? 'Failed to sign payment')
  }

  if (
    'success' in signData &&
    signData.success === true &&
    'transactionHash' in signData
  ) {
    return {
      success: true,
      message: signData.message,
      content: signData.content,
      transactionHash: signData.transactionHash,
    }
  }

  const paymentHeader = (signData as { paymentHeader?: string }).paymentHeader
  if (!paymentHeader || typeof paymentHeader !== 'string') {
    throw new Error('No payment header in response')
  }

  const contentRes = await fetch(protectedContentUrl, {
    headers: { 'X-Payment': paymentHeader },
  })
  const contentData = (await contentRes.json()) as {
    success: boolean
    message?: string
    content?: unknown
  }
  if (!contentRes.ok) {
    const err = contentData as { message?: string; details?: string; error?: string }
    throw new Error(err.details ?? err.message ?? err.error ?? 'Protected content request failed')
  }
  return {
    success: contentData.success,
    message: contentData.message,
    content: contentData.content,
  }
}

export function BackendWalletExperience() {
  const baseUrl = getApiBaseUrl()
  const [status, setStatus] = useState<BackendWalletStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [createdWallet, setCreatedWallet] = useState<CreatedWallet | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message?: string
    content?: unknown
    transactionHash?: string
  } | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<bigint>(0n)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [merchantBalance, setMerchantBalance] = useState<bigint>(0n)
  const [merchantBalanceLoading, setMerchantBalanceLoading] = useState(false)

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/backend-wallet/status`)
      const data = (await res.json()) as BackendWalletStatus
      setStatus(data)
    } catch {
      setStatus({ configured: false })
    } finally {
      setStatusLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepolia,
        transport: http(),
      }),
    [],
  )

  const requiredAmountRaw = useMemo(() => {
    const raw = status?.maxAmountRequired
    if (raw) return BigInt(raw)
    return BigInt(Math.round(DEFAULT_AMOUNT_USDC * 10 ** USDC_DECIMALS))
  }, [status?.maxAmountRequired])

  const requiredAmountFormatted = useMemo(
    () => Number(formatUnits(requiredAmountRaw, USDC_DECIMALS)),
    [requiredAmountRaw],
  )

  const payerAddress = status?.payerAddress

  const merchantAddress = status?.payToAddress

  const fetchBalance = useCallback(async () => {
    if (!payerAddress) {
      setUsdcBalance(0n)
      return
    }
    setBalanceLoading(true)
    try {
      const balance = await getUSDCBalance(
        publicClient as BalanceClient,
        payerAddress as `0x${string}`,
      )
      setUsdcBalance(balance)
    } catch {
      setUsdcBalance(0n)
    } finally {
      setBalanceLoading(false)
    }
  }, [payerAddress, publicClient])

  const fetchMerchantBalance = useCallback(async () => {
    if (!merchantAddress) {
      setMerchantBalance(0n)
      return
    }
    setMerchantBalanceLoading(true)
    try {
      const balance = await getUSDCBalance(
        publicClient as BalanceClient,
        merchantAddress as `0x${string}`,
      )
      setMerchantBalance(balance)
    } catch {
      setMerchantBalance(0n)
    } finally {
      setMerchantBalanceLoading(false)
    }
  }, [merchantAddress, publicClient])

  useEffect(() => {
    if (!payerAddress) return
    void fetchBalance()
  }, [payerAddress, fetchBalance])

  useEffect(() => {
    if (!merchantAddress) return
    void fetchMerchantBalance()
  }, [merchantAddress, fetchMerchantBalance])

  const hasEnoughBalance = payerAddress
    ? usdcBalance >= requiredAmountRaw
    : false
  const formattedBalance =
    payerAddress && (usdcBalance > 0n || !balanceLoading)
      ? formatUnits(usdcBalance, USDC_DECIMALS)
      : null

  const handleCreateWallet = useCallback(async () => {
    setCreateLoading(true)
    setCreateError(null)
    setCreatedWallet(null)
    try {
      const res = await fetch(`${baseUrl}/api/backend-wallet/create`, {
        method: 'POST',
      })
      const data = (await res.json()) as
        | CreatedWallet
        | { error: string; details?: string }
      if (!res.ok) {
        const err = data as { error: string; details?: string }
        setCreateError(err.details ?? err.error ?? 'Failed to create wallet')
        return
      }
      setCreatedWallet(data as CreatedWallet)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create wallet')
    } finally {
      setCreateLoading(false)
    }
  }, [baseUrl])

  const handlePay = useCallback(async () => {
    setTestLoading(true)
    setTestError(null)
    setTestResult(null)
    try {
      const result = await runBackendWalletPayment(baseUrl)
      setTestResult(result)
      void fetchBalance()
      void fetchMerchantBalance()
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setTestLoading(false)
    }
  }, [baseUrl, fetchBalance, fetchMerchantBalance])

  const copyToClipboard = useCallback((text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    })
  }, [])

  const alreadyConfigured = Boolean(status?.payerAddress)

  if (statusLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <div className="text-center">
          <p className="text-zinc-400">Loading backend wallet status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Backend Wallet (Option B)</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create a server-side wallet and test the x402 payment flow without a
            browser wallet.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Use a <strong>separate</strong> recipient address (not your backend or embedded wallet). Create one in the <strong>Pay-to address</strong> tab, copy to <code className="rounded bg-zinc-700 px-1">PAY_TO_ADDRESS</code> in backend <code className="rounded bg-zinc-700 px-1">.env.local</code>, restart, then fund Payer and pay from each tab.
          </p>
        </div>

        {/* Backend wallet setup or wallets + pay */}
        <section className="rounded-lg border border-zinc-700 bg-zinc-800 p-6 shadow-xl">
          <h2 className="text-lg font-medium">1. Backend wallet</h2>
          {alreadyConfigured && payerAddress ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-zinc-400">
                Payer is configured. Fund with USDC.
              </p>
              <div className="space-y-2 rounded border border-zinc-700 bg-zinc-900 p-4">
                <p className="text-xs text-zinc-500">
                  Balances below are for the USDC transfer (Payer → Recipient). On the block explorer the tx may show a different &quot;From&quot; (bundler); the 0.1 USDC is debited from Payer and credited to Recipient.
                </p>
                <AddressRow
                  label="Payer (fund this):"
                  value={payerAddress}
                  explorerUrl={getExplorerAddressUrl(payerAddress ?? '', status?.network)}
                  copied={copied}
                  copyLabel="payer"
                  onCopy={copyToClipboard}
                />
                <p className="text-xs text-zinc-500">
                  Fund Payer:{' '}
                  <a href={USDC_FAUCET_URL} target="_blank" rel="noopener noreferrer" className="underline">
                    Get USDC (faucet)
                  </a>
                  {' · '}
                  <a
                    href={getExplorerAddressUrl(payerAddress ?? '', status?.network)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Explorer
                  </a>
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Payer balance:</span>
                  <span className="font-mono">
                    {balanceLoading ? '…' : formattedBalance != null ? `$${formattedBalance} USDC` : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void fetchBalance()}
                    disabled={balanceLoading}
                    className="rounded bg-zinc-600 px-2 py-1 text-xs hover:bg-zinc-500 disabled:opacity-50"
                  >
                    ↻
                  </button>
                </div>
                {status?.payToAddress && status.payToAddress.toLowerCase() !== payerAddress?.toLowerCase() ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Recipient:</span>
                    <span className="font-mono truncate max-w-[12rem]" title={status.payToAddress}>
                      {status.payToAddress.slice(0, 6)}…{status.payToAddress.slice(-4)}
                    </span>
                    <span className="font-mono">
                      {merchantBalanceLoading ? '…' : `$${formatUnits(merchantBalance, USDC_DECIMALS)} USDC`}
                    </span>
                    <button
                      type="button"
                      onClick={() => void fetchMerchantBalance()}
                      disabled={merchantBalanceLoading}
                      className="rounded bg-zinc-600 px-2 py-1 text-xs hover:bg-zinc-500 disabled:opacity-50"
                      title="Refresh recipient balance"
                    >
                      ↻
                    </button>
                  </div>
                ) : status?.payToAddress ? null : (
                  <div className="text-sm text-zinc-500">
                    Recipient: Not set (use Pay-to address tab)
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Amount:</span>
                  <span className="font-mono">${requiredAmountFormatted} USDC</span>
                </div>
                {!hasEnoughBalance && !balanceLoading ? (
                  <p className="text-xs text-amber-400">
                    Insufficient USDC —{' '}
                    <a href={USDC_FAUCET_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      get USDC from Circle faucet
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-zinc-400">
                Requires{' '}
                <code className="rounded bg-zinc-700 px-1">
                  OPENFORT_SECRET_KEY
                </code>{' '}
                and{' '}
                <code className="rounded bg-zinc-700 px-1">
                  OPENFORT_WALLET_SECRET
                </code>{' '}
                in backend{' '}
                <code className="rounded bg-zinc-700 px-1">.env.local</code>.
              </p>
              <button
                type="button"
                onClick={handleCreateWallet}
                disabled={createLoading}
                className="mt-4 w-full rounded bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {createLoading ? 'Creating…' : 'Create backend wallet'}
              </button>
              {createError ? (
                <p className="mt-3 text-sm text-red-400">{createError}</p>
              ) : null}
              {createdWallet ? (
                <div className="mt-4 space-y-3 rounded border border-zinc-600 bg-zinc-900 p-4">
                  <p className="text-xs font-medium text-zinc-400">
                    Add to backend/.env.local and restart:
                  </p>
                  <AddressRow
                    label="OPENFORT_BACKEND_WALLET_ID"
                    value={`OPENFORT_BACKEND_WALLET_ID=${createdWallet.id}`}
                    copyValue={`OPENFORT_BACKEND_WALLET_ID=${createdWallet.id}`}
                    copied={copied}
                    copyLabel="id"
                    onCopy={copyToClipboard}
                  />
                  <AddressRow
                    label="PAY_TO_ADDRESS"
                    value={`PAY_TO_ADDRESS=${createdWallet.address}`}
                    copyValue={`PAY_TO_ADDRESS=${createdWallet.address}`}
                    copied={copied}
                    copyLabel="address"
                    onCopy={copyToClipboard}
                  />
                </div>
              ) : null}
            </>
          )}
        </section>

        {/* Pay */}
        <section className="rounded-lg border border-zinc-700 bg-zinc-800 p-6 shadow-xl">
          <h2 className="text-lg font-medium">2. Pay</h2>
          {alreadyConfigured ? (
            <>
              <p className="mt-1 text-sm text-zinc-400">
                Sign and unlock content. Amount: <strong>${requiredAmountFormatted} USDC</strong>. Off-chain: no ETH needed.
              </p>
              <button
                type="button"
                onClick={handlePay}
                disabled={testLoading || !hasEnoughBalance}
                className="mt-4 w-full rounded bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {testLoading
                  ? 'Paying…'
                  : !hasEnoughBalance && !balanceLoading
                    ? `Add USDC (${requiredAmountFormatted} required)`
                    : `Pay ${requiredAmountFormatted} USDC`}
              </button>
              {testError ? (
                <p className="mt-3 text-sm text-red-400">{testError}</p>
              ) : null}
              {testResult ? (
                <div className="mt-4 rounded border border-green-800 bg-zinc-900 p-4">
                  <p className="text-sm text-green-400">
                    {testResult.transactionHash
                      ? 'Payment accepted (on-chain)'
                      : 'Content unlocked (off-chain)'}
                  </p>
                  {testResult.transactionHash ? (
                    <p className="mt-2 text-xs text-zinc-400">
                      Tx:{' '}
                      <a
                        href={getExplorerTxUrl(testResult.transactionHash, status?.network)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {testResult.transactionHash}
                      </a>
                    </p>
                  ) : null}
                  {testResult.content ? (
                    <pre className="mt-2 overflow-auto text-xs text-zinc-300">
                      {JSON.stringify(testResult.content, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              Set <code className="rounded bg-zinc-700 px-1">OPENFORT_WALLET_SECRET</code> and{' '}
              <code className="rounded bg-zinc-700 px-1">OPENFORT_BACKEND_WALLET_ID</code> in backend{' '}
              <code className="rounded bg-zinc-700 px-1">.env.local</code> and restart to pay.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
