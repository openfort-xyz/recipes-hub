'use client'

import { OpenfortButton, use7702Authorization, useOpenfort, useSignOut, useUser } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPublicClient, http, zeroAddress } from 'viem'
import { createBundlerClient, createPaymasterClient, toSimple7702SmartAccount } from 'viem/account-abstraction'
import { baseSepolia } from 'viem/chains'
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toAccount } from 'viem/accounts'

// Simple7702Account implementation (eth-infinitism) — default in viem's toSimple7702SmartAccount
const SIMPLE_7702_ADDRESS = '0xe6Cae83BdE06E4c305530e199D7217f42808555B'

const title = 'Openfort + 7702'

export function UserOperation() {
  const { user, isAuthenticated: authenticated } = useUser()
  const { signOut: logout } = useSignOut()
  const { client } = useOpenfort()
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { signAuthorization } = use7702Authorization()

  const walletClient = useWalletClient()
  const { chainId,  } = useAccount()
  const { switchChain } = useSwitchChain()
  const { wallets, activeWallet, setActive } = useEthereumEmbeddedWallet()

  useEffect(() => {
    if (wallets.length > 0 && !activeWallet) {
      setActive({ address: wallets[0].address }).catch(() => {})
    }
  }, [wallets.length, activeWallet, setActive])

  useEffect(() => {
    if (chainId !== baseSepolia.id) {
      switchChain(
        { chainId: baseSepolia.id },
        { onError: (err) => setError(`Please switch to Base Sepolia manually. ${err.message}`) },
      )
    }
  }, [chainId, switchChain])

  const sendUserOperation = async () => {
    if (!user || !activeWallet || !client) {
      setError('Wallet or client not ready')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!walletClient.data?.account) {
        throw new Error('Wallet not ready — please wait a moment and try again')
      }

      const eoa = walletClient.data.account.address
      const openfortRpcUrl = `https://api.openfort.io/rpc/${baseSepolia.id}`

      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      })

      const owner = toAccount({
        address: walletClient.data.account.address,
        async sign({ hash }) {
          return walletClient.data!.signMessage({ message: { raw: hash } })
        },
        async signMessage({ message }) {
          return walletClient.data!.signMessage({ message })
        },
        async signTransaction(tx) {
          return walletClient.data!.signTransaction(tx as any)
        },
        async signTypedData(typedData) {
          return walletClient.data!.signTypedData(typedData as any)
        },
      })
      // viem's toSimple7702SmartAccount handles everything:
      // - factory: 0x7702, factoryData: 0x
      // - execute/executeBatch call encoding (Simple7702Account ABI)
      // - EIP-712 UserOp signing with plain ECDSA (no wrapping)
      // - defaults to implementation 0xe6Cae83BdE06E4c305530e199D7217f42808555B
      const smartAccount = await toSimple7702SmartAccount({
        client: publicClient,
        owner: owner as never,
      })

      const paymasterClient = createPaymasterClient({
        transport: http(openfortRpcUrl, {
          fetchOptions: {
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY}` },
          },
        }),
      })

      const bundlerClient = createBundlerClient({
        account: smartAccount,
        paymaster: paymasterClient,
        client: publicClient,
        transport: http(openfortRpcUrl, {
          fetchOptions: {
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY}` },
          },
        }),
      })

      // Sign EIP-7702 authorization using Openfort's hook
      const authorization = await signAuthorization({
        contractAddress: SIMPLE_7702_ADDRESS,
        chainId: baseSepolia.id,
        nonce: await publicClient.getTransactionCount({ address: eoa }),
      })

      const txnHash = await bundlerClient.sendUserOperation({
        calls: [
          {
            to: zeroAddress,
            data: '0x',
            value: BigInt(0),
          },
        ],
        authorization,
        paymasterContext: {
          policyId: process.env.NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID,
        },
      })

      const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: txnHash })
      setTxHash(receipt.receipt.transactionHash)
    } catch (err) {
      console.error('Error sending user operation:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <OpenfortButton label="Login with Openfort" />
      </div>
    )
  }

  return (
    <div className="p-8 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">{title}</h1>

      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Connected Address</CardTitle>
          <CardDescription className="text-sm font-mono">
            {activeWallet?.address || 'No address available'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2 justify-end">
          <Button onClick={() => logout()} variant="outline">
            Logout
          </Button>
          <Button
            onClick={() => sendUserOperation()}
            disabled={loading || !walletClient.data || !client}
            variant="default"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : null}
            Send 7702 UserOp
          </Button>
        </CardFooter>
      </Card>

      {txHash && (
        <Card className="w-full max-w-md bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
          <CardHeader>
            <CardTitle className="text-base">Transaction Hash</CardTitle>
            <CardDescription className="break-all font-mono">{txHash}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="link" className="p-0 h-auto" asChild>
              <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                View on Basescan
              </a>
            </Button>
          </CardFooter>
        </Card>
      )}

      {error && (
        <Card className="w-full max-w-md bg-destructive/10 border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base">Error</CardTitle>
            <CardDescription className="break-all text-destructive dark:text-destructive/90">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
