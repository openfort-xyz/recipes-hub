import { useState } from 'react'
import { isAddress, parseEther } from 'viem'
import { useAccount, usePublicClient, useSendTransaction, useSwitchChain } from 'wagmi'
import type { DemoConfig } from '../config/demos'

export function SendForm({ demo, onSettled }: { demo: DemoConfig; onSettled?: () => void }) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hash, setHash] = useState<string | null>(null)

  const { chainId: activeChainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { sendTransactionAsync } = useSendTransaction()
  const publicClient = usePublicClient({ chainId: demo.chainId })

  const recipientValid = isAddress(recipient)
  const amountValid = Number(amount) > 0

  async function handleSend() {
    setError(null)
    setHash(null)
    setSending(true)
    try {
      if (activeChainId !== demo.chainId) {
        await switchChainAsync({ chainId: demo.chainId })
      }
      const txHash = await sendTransactionAsync({
        to: recipient as `0x${string}`,
        value: parseEther(amount),
        chainId: demo.chainId,
      })
      setHash(txHash)
      await publicClient?.waitForTransactionReceipt({ hash: txHash })
      onSettled?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <p className="text-sm text-neutral-400 mb-4">
        Send {demo.tokenSymbol} to another address on {demo.network}.
      </p>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient address (0x...)"
          className="w-full bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
        />
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full bg-neutral-800 text-white text-sm rounded-lg pl-3 pr-16 py-2 border border-neutral-700"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
            {demo.tokenSymbol}
          </span>
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !recipientValid || !amountValid}
          className="bg-white text-black font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {hash && (
        <p className="mt-3 text-xs">
          <a
            href={`${demo.explorerUrl}/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline"
          >
            {hash}
          </a>
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  )
}
