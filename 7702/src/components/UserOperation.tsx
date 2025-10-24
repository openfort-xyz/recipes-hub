'use client'

import { OpenfortButton, type UserWallet, use7702Authorization, useSignOut, useUser, useWallets } from '@openfort/react'
import { Loader2 } from 'lucide-react'
import { createSmartAccountClient } from 'permissionless'
import { toSimpleSmartAccount } from 'permissionless/accounts'
import { createPimlicoClient } from 'permissionless/clients/pimlico'
import { useEffect, useState } from 'react'
import { createPublicClient, http, zeroAddress } from 'viem'
import { entryPoint08Address } from 'viem/account-abstraction'
import { sepolia } from 'viem/chains'
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const title = 'Openfort + Permissionless + 7702'

export function UserOperation() {
  const { user, isAuthenticated: authenticated } = useUser()
  const { signOut: logout } = useSignOut()
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { signAuthorization } = use7702Authorization()

  const walletClient = useWalletClient()
  const { isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const { wallets, setActiveWallet } = useWallets()
  const [embeddedWallet, setEmbeddedWallet] = useState<UserWallet | undefined>(undefined)

  useEffect(() => {
    if (wallets.length > 0) {
      setActiveWallet({
        walletId: wallets[0].id,
        address: wallets[0].address,
      }).then((activeWallet) => {
        setEmbeddedWallet(activeWallet.wallet)
      })
    }
  }, [wallets.length])

  // Automatically switch to Sepolia when wallet connects
  useEffect(() => {
    console.log('isConnected:', isConnected, 'chainId:', chainId)
    if (chainId !== sepolia.id) {
      console.log('Switching to Sepolia network...')
      switchChain(
        { chainId: sepolia.id },
        {
          onError: (error) => {
            console.error('Failed to switch chain:', error)
            setError(`Please switch to Sepolia network manually. ${error.message}`)
          },
        }
      )
    }
  }, [chainId, switchChain])

  const sendUserOperation = async () => {
    if (!user || !embeddedWallet) {
      setError('No wallet connected')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const pimlicoApiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY

      if (!pimlicoApiKey || pimlicoApiKey === 'YOUR_PIMLICO_API_KEY') {
        throw new Error('Please set a valid Pimlico API key in your .env.local file')
      }

      const pimlicoUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${pimlicoApiKey}`

      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL!),
      })

      const pimlicoClient = createPimlicoClient({
        transport: http(pimlicoUrl),
      })
      console.log('walletClient:', walletClient)
      // Get the wallet provider
      if (!walletClient.data) {
        throw new Error('No wallet found')
      }

      const simpleSmartAccount = await toSimpleSmartAccount({
        owner: walletClient.data,
        entryPoint: {
          address: entryPoint08Address,
          version: '0.8',
        },
        client: publicClient,
        address: walletClient.data.account.address,
      })

      // Create the smart account client
      const smartAccountClient = createSmartAccountClient({
        account: simpleSmartAccount,
        chain: sepolia,
        bundlerTransport: http(pimlicoUrl),
        paymaster: pimlicoClient,
        userOperation: {
          estimateFeesPerGas: async () => {
            return (await pimlicoClient.getUserOperationGasPrice()).fast
          },
        },
      })

      const authorization = await signAuthorization({
        contractAddress: '0xe6Cae83BdE06E4c305530e199D7217f42808555B',
        chainId: sepolia.id,
        nonce: await publicClient.getTransactionCount({
          address: walletClient.data.account.address,
        }),
      })

      const txnHash = await smartAccountClient.sendTransaction({
        calls: [
          {
            to: zeroAddress,
            data: '0x',
            value: BigInt(0),
          },
        ],
        factory: '0x7702',
        factoryData: '0x',
        paymasterContext: {
          sponsorshipPolicyId: process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID,
        },
        authorization,
      })

      setTxHash(txnHash)
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
            {embeddedWallet?.address || 'No address available'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2 justify-end">
          <Button onClick={() => logout()} variant="outline">
            Logout
          </Button>
          <Button onClick={() => sendUserOperation()} disabled={loading} variant="default">
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
              <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                View on Etherscan
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
