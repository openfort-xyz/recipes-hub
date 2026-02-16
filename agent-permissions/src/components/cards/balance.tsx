'use client'

import { useSignOut, useUser } from '@openfort/react'
import { useCallback, useEffect, useState } from 'react'
import { type Address, type Hex, erc20Abi, formatUnits, getAddress, padHex } from 'viem'
import { useAccount, useBlockNumber, useReadContract, useSendTransaction } from 'wagmi'
import {
  KeyType,
  encodeExecute,
  encodeRegisterKey,
  encodeUpdateKeySettings,
  hashKey,
} from '@/lib/calibur'

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const
const MOCK_ERC20_ADDRESS = '0xbabe0001489722187FbaF0689C47B2f5E97545C5' as const
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address
const DCA_DURATION_SECONDS = 5 * 60 // 5 minutes
const DCA_FREQUENCY_SECONDS = 60 // matches the Vercel cron interval
const EXPLORER_URL = 'https://sepolia.basescan.org/address'

function truncateAddress(addr: string) {
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
}

function AddressLink({ addr, label }: { addr: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    await navigator.clipboard.writeText(addr)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <span className="inline-flex items-center gap-1">
      {label && <span>{label}</span>}
      <a
        href={`${EXPLORER_URL}/${addr}`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground"
        title="View on BaseScan"
      >
        {truncateAddress(addr)}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground cursor-pointer"
        title="Copy address"
      >
        {copied ? '✓' : '⧉'}
      </button>
    </span>
  )
}

interface DcaPurchase {
  timestamp: string
  usdcSpent: string
  wethReceived: string
  price: string
}

interface DcaStatus {
  enabled: boolean
  amount: string
  purchases: DcaPurchase[]
  agentAddress?: string
  lastPurchase?: number
  expiresAt?: number | null
}

export const Balance = () => {
  const { address } = useAccount()
  const { signOut } = useSignOut()
  const { getAccessToken } = useUser()
  const [isAirdropping, setIsAirdropping] = useState(false)
  const [airdropError, setAirdropError] = useState<string | null>(null)
  const [airdropSuccess, setAirdropSuccess] = useState(false)

  const [dcaAmount, setDcaAmount] = useState('0.1')
  const [dcaStatus, setDcaStatus] = useState<DcaStatus | null>(null)
  const [isDcaLoading, setIsDcaLoading] = useState(false)
  const [dcaError, setDcaError] = useState<string | null>(null)
  const [dcaExpiresAt, setDcaExpiresAt] = useState<number | null>(null)
  const [expiryCountdown, setExpiryCountdown] = useState<string | null>(null)

  const { sendTransactionAsync } = useSendTransaction()

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getAccessToken()
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }, [getAccessToken])

  const {
    data: balance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const {
    data: mockBalance,
    refetch: refetchMockBalance,
  } = useReadContract({
    address: MOCK_ERC20_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: blockNumber } = useBlockNumber({ watch: true })

  const formattedBalance = balance !== undefined ? formatUnits(balance, 6) : '0'
  const formattedMockBalance = mockBalance !== undefined ? formatUnits(mockBalance, 18) : '0'
  const hasBalance = balance !== undefined && balance > BigInt(0)

  const [countdown, setCountdown] = useState<number | null>(null)

  // Refetch balances on every new block
  useEffect(() => {
    if (blockNumber) {
      refetchBalance()
      refetchMockBalance()
    }
  }, [blockNumber, refetchBalance, refetchMockBalance])

  const fetchDcaStatus = useCallback(async () => {
    if (!address) return
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/dca?address=${address}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setDcaStatus(data)
        // Sync expiry from backend (onchain truth) so countdown survives refresh
        if (data.enabled && data.expiresAt) {
          setDcaExpiresAt(data.expiresAt)
        } else if (!data.enabled) {
          setDcaExpiresAt(null)
        }
      }
    } catch {
      // ignore
    }
  }, [address, authHeaders])

  useEffect(() => {
    fetchDcaStatus()
  }, [fetchDcaStatus])

  // Poll DCA status when enabled
  useEffect(() => {
    if (!dcaStatus?.enabled) return
    const interval = setInterval(() => {
      fetchDcaStatus()
    }, 5000)
    return () => clearInterval(interval)
  }, [dcaStatus?.enabled, fetchDcaStatus])

  // Countdown timer for next DCA execution
  // The cron runs every DCA_FREQUENCY_SECONDS. Next execution is lastPurchase + frequency.
  useEffect(() => {
    if (!dcaStatus?.enabled || !dcaStatus.lastPurchase) {
      setCountdown(null)
      return
    }
    const tick = () => {
      if (dcaExpiresAt && dcaExpiresAt <= Date.now()) {
        setCountdown(null)
        return
      }
      const remaining = Math.max(
        0,
        Math.ceil((dcaStatus.lastPurchase! + DCA_FREQUENCY_SECONDS * 1000 - Date.now()) / 1000),
      )
      setCountdown(remaining)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [dcaStatus?.enabled, dcaStatus?.lastPurchase, dcaExpiresAt])

  // DCA expiry countdown — re-fetch status when expired so UI reflects onchain state
  useEffect(() => {
    if (!dcaExpiresAt || !dcaStatus?.enabled) {
      setExpiryCountdown(null)
      return
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((dcaExpiresAt - Date.now()) / 1000))
      if (remaining <= 0) {
        setExpiryCountdown('Expired')
        // Refetch status — backend checks onchain and will return enabled: false
        fetchDcaStatus()
        return
      }
      const m = Math.floor(remaining / 60)
      const s = remaining % 60
      setExpiryCountdown(`${m}m ${s.toString().padStart(2, '0')}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [dcaExpiresAt, dcaStatus?.enabled, fetchDcaStatus])

  const handleAirdrop = async () => {
    if (!address) return
    setIsAirdropping(true)
    setAirdropError(null)
    setAirdropSuccess(false)
    try {
      const res = await fetch('/api/airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ address }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Airdrop failed')
      setAirdropSuccess(true)
      setTimeout(() => refetchBalance(), 3000)
    } catch (err) {
      setAirdropError(err instanceof Error ? err.message : 'Airdrop failed')
    } finally {
      setIsAirdropping(false)
    }
  }

  const handleDcaToggle = async () => {
    if (!address) return
    setIsDcaLoading(true)
    setDcaError(null)
    try {
      const enabling = !dcaStatus?.enabled

      if (enabling) {
        const amt = Number(dcaAmount)
        const currentBalance = balance !== undefined ? Number(formatUnits(balance, 6)) : 0
        if (amt > currentBalance) {
          setDcaError(`Amount per purchase ($${dcaAmount}) exceeds your USDC balance ($${currentBalance}).`)
          setIsDcaLoading(false)
          return
        }
      }

      const res = await fetch('/api/dca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          address,
          amount: dcaAmount,
          enabled: enabling,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'DCA update failed')

      // When enabling, register the agent's address as a Calibur key onchain
      if (enabling && data.agentAddress) {
        const agentAddr = getAddress(data.agentAddress) as Address
        // Encode the agent address as a secp256k1 public key (pad to 32 bytes)
        const agentKey = {
          keyType: KeyType.Secp256k1,
          publicKey: padHex(agentAddr, { size: 32 }) as Hex,
        }
        const expiration = Math.floor(Date.now() / 1000) + DCA_DURATION_SECONDS

        const registerCall = encodeRegisterKey(agentKey)
        const keyHash = hashKey(agentKey)
        const updateCall = encodeUpdateKeySettings(keyHash, {
          isAdmin: false,
          expiration,
          hook: ZERO_ADDRESS,
        })

        const txData = encodeExecute([registerCall, updateCall])
        await sendTransactionAsync({ to: address, data: txData })
        setDcaExpiresAt(expiration * 1000) // store as ms
      } else if (!enabling) {
        setDcaExpiresAt(null)
      }

      setDcaStatus(data)
    } catch (err) {
      setDcaError(err instanceof Error ? err.message : 'DCA update failed')
    } finally {
      setIsDcaLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {address ? <AddressLink addr={address} /> : ''}
        </p>
      </div>

      {/* USDC Balance */}
      <div className="p-4 border border-border rounded-lg text-center">
        <p className="text-sm text-muted-foreground mb-1">USDC Balance (Base Sepolia)</p>
        <p className="text-3xl font-bold">{isBalanceLoading ? '...' : `$${formattedBalance}`}</p>
      </div>

      {/* Mock ERC20 Balance */}
      <div className="p-4 border border-border rounded-lg text-center">
        <p className="text-sm text-muted-foreground mb-1">WETH Balance (Mock ERC20)</p>
        <p className="text-3xl font-bold">{formattedMockBalance}</p>
      </div>

      {/* Airdrop */}
      <div>
        <button type="button" className="btn" onClick={handleAirdrop} disabled={isAirdropping || hasBalance}>
          {isAirdropping ? 'Requesting airdrop...' : hasBalance ? 'USDC already funded' : 'Airdrop testnet USDC'}
        </button>
        {airdropError && <p className="text-red-500 text-sm mt-2">{airdropError}</p>}
        {airdropSuccess && <p className="text-green-500 text-sm mt-2">Airdrop sent! Balance will update shortly.</p>}
        <p className="text-xs text-muted-foreground mt-2">
          Or get USDC from the{' '}
          <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Circle Faucet
          </a>{' '}
          on Base Sepolia.
        </p>
      </div>

      {/* DCA Section */}
      {hasBalance && (
        <div className="p-4 border border-border rounded-lg space-y-4">
          <h2 className="text-lg font-semibold">DCA into WETH</h2>
          <p className="text-sm text-muted-foreground">Automatically buy WETH with your USDC on a schedule.</p>

          {!dcaStatus?.enabled && (
            <div className="space-y-3">
              <div>
                <label htmlFor="dca-amount" className="block text-sm font-medium mb-1">
                  Amount per purchase (USDC)
                </label>
                <input
                  id="dca-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={dcaAmount}
                  onChange={(e) => setDcaAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Executes once per minute</p>
              </div>
            </div>
          )}

          <button type="button" className="btn" onClick={handleDcaToggle} disabled={isDcaLoading}>
            {isDcaLoading ? 'Updating...' : dcaStatus?.enabled ? 'Disable DCA' : 'Enable DCA'}
          </button>
          {dcaError && <p className="text-red-500 text-sm mt-2">{dcaError}</p>}
          {dcaStatus?.enabled && countdown !== null && (
            <p className="text-sm text-muted-foreground mt-2">
              {countdown === 0 ? (
                <>Next DCA execution <span className="font-mono font-semibold">any moment...</span></>
              ) : (
                <>Next DCA execution in <span className="font-mono font-semibold">{countdown}s</span></>
              )}
            </p>
          )}
          {dcaStatus?.enabled && expiryCountdown && (
            <p className="text-sm text-muted-foreground mt-1">
              Agent permission expires in <span className="font-mono font-semibold">{expiryCountdown}</span>
            </p>
          )}
          {dcaStatus?.agentAddress && (
            <p className="text-xs text-muted-foreground mt-2">
              <AddressLink addr={dcaStatus.agentAddress} label="Agent:" />
            </p>
          )}

          {/* DCA Purchase History */}
          {dcaStatus?.purchases && dcaStatus.purchases.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Purchase History</h3>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {dcaStatus.purchases.map((p, i) => (
                  <div key={`${p.timestamp}-${i}`} className="text-xs p-2 bg-muted/30 rounded flex justify-between">
                    <span>{new Date(p.timestamp).toLocaleTimeString()}</span>
                    <span>-{p.usdcSpent} USDC</span>
                    <span>+{p.wethReceived} WETH</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sign Out */}
      <button type="button" className="btn bg-muted text-foreground hover:bg-muted-foreground/20" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  )
}
