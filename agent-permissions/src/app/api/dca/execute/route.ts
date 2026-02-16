import Openfort from '@openfort/openfort-node'
import { type NextRequest, NextResponse } from 'next/server'
import { type Address, createClient, encodeFunctionData, erc20Abi, http, padHex, parseUnits, publicActions } from 'viem'
import { createBundlerClient, createPaymasterClient } from 'viem/account-abstraction'
import { toAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { AuthError, authorizeAddress } from '@/lib/auth'
import { createCaliburSessionAccount, getCaliburKeySettings, getRegisteredKeys, hashKey, KeyType } from '@/lib/calibur'
import { dcaStore } from '@/lib/dcaStore'

const DCA_FREQUENCY_SECONDS = 60 // matches the Vercel cron interval
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address
const MOCK_ERC20_ADDRESS = '0xbabe0001489722187FbaF0689C47B2f5E97545C5' as Address
// Demo recipient — in production this would be a DEX router
const WETH_TREASURY = '0x000000000000000000000000000000000000dEaD' as Address
// Default amount per purchase when no stored config exists
const DEFAULT_AMOUNT = '1'

const mintAbi = [
  {
    type: 'function' as const,
    name: 'mint',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
] as const

function getOpenfort() {
  const key = process.env.OPENFORT_SECRET_KEY
  if (!key) throw new Error('OPENFORT_SECRET_KEY is not configured')
  return new Openfort(key, {
    walletSecret: process.env.OPENFORT_WALLET_SECRET_KEY,
  })
}

function getOpenfortRpcUrl() {
  const chainId = baseSepolia.id
  return `https://api.openfort.io/rpc/${chainId}`
}

function getRpcHeaders() {
  return {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY}`,
  }
}

// Simulated WETH price for demo
function getSimulatedWethPrice(): number {
  return 2800 + Math.random() * 400
}

function getViemClient() {
  return createClient({
    chain: baseSepolia,
    transport: http(),
  }).extend(publicActions)
}

/**
 * Check onchain whether a specific agent key is active on a user's Calibur account.
 */
async function isAgentEnabledOnchain(
  client: ReturnType<typeof getViemClient>,
  userAddress: Address,
  agentAddress: Address
): Promise<boolean> {
  try {
    const keys = await getRegisteredKeys(client, userAddress)
    const now = Math.floor(Date.now() / 1000)

    for (const { key, keyHash } of keys) {
      if (key.keyType !== KeyType.Secp256k1) continue
      const settings = await getCaliburKeySettings(client, userAddress, keyHash)
      if (settings.isAdmin) continue
      if (settings.expiration > 0 && settings.expiration <= now) continue

      const keyAddr = `0x${key.publicKey.slice(26)}`.toLowerCase()
      if (keyAddr === agentAddress.toLowerCase()) return true
    }
  } catch {
    // Account isn't a Calibur account yet
  }
  return false
}

export async function GET(request: NextRequest) {
  console.log('[DCA CRON] Handler invoked')
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now = Date.now()
  const results: Array<{ user: string; userOpHash?: string; error?: string }> = []

  // Initialize the Openfort client (configures the global API client for raw calls)
  const openfort = getOpenfort()
  const viemClient = getViemClient()

  // Discover all registered DCA agents from Redis
  const userAddresses = await dcaStore.listAgents()
  console.log(`[DCA] Found ${userAddresses.length} registered agents in store`)

  const dcaAgents: Array<{ userAddress: string; agentId: string; agentAddress: Address }> = []
  for (const userAddress of userAddresses) {
    const config = await dcaStore.get(userAddress)
    if (!config?.agentId || !config?.agentAddress) continue
    dcaAgents.push({ userAddress, agentId: config.agentId, agentAddress: config.agentAddress as Address })
  }
  console.log(`[DCA] Found ${dcaAgents.length} DCA agents with valid config`)

  // For each agent, check onchain that its key is still active + check timing
  const pending: typeof dcaAgents = []
  for (const agent of dcaAgents) {
    const cached = await dcaStore.get(agent.userAddress)
    const frequencyMs = DCA_FREQUENCY_SECONDS * 1000
    const lastPurchase = cached?.lastPurchase || 0
    if (now - lastPurchase < frequencyMs * 0.8) {
      console.log(`[DCA] Skipping ${agent.userAddress}: too soon (${now - lastPurchase}ms < ${frequencyMs}ms)`)
      continue
    }

    const enabled = await isAgentEnabledOnchain(viemClient, agent.userAddress as Address, agent.agentAddress)
    console.log(`[DCA] Agent ${agent.agentAddress} for ${agent.userAddress}: onchain enabled=${enabled}`)
    if (enabled) {
      pending.push(agent)
    } else {
      await dcaStore.remove(agent.userAddress)
      console.log(`[DCA] Removed disabled agent ${agent.userAddress} from store`)
    }
  }
  console.log(`[DCA] ${pending.length} agents pending execution`)

  const rpcUrl = getOpenfortRpcUrl()
  const rpcHeaders = getRpcHeaders()
  const rpcTransport = http(rpcUrl, { fetchOptions: { headers: rpcHeaders } })
  const paymasterClient = createPaymasterClient({ transport: rpcTransport })

  for (const { userAddress, agentId, agentAddress } of pending) {
    try {
      const cached = await dcaStore.get(userAddress)
      const amount = cached?.amount ?? DEFAULT_AMOUNT

      // Retrieve the backend wallet from Openfort and wrap as viem account
      const agent = await openfort.accounts.evm.backend.get({ id: agentId })
      const viemAccount = toAccount({
        address: agent.address,
        sign: async ({ hash }) => agent.sign({ hash }),
        signMessage: async ({ message }) => agent.signMessage({ message }),
        signTransaction: async (tx) => agent.signTransaction(tx),
        signTypedData: async (typedData) => agent.signTypedData(typedData),
      })

      // Compute the agent's keyHash (same as registered onchain)
      const agentKey = {
        keyType: KeyType.Secp256k1,
        publicKey: padHex(agentAddress, { size: 32 }),
      }
      const keyHash = hashKey(agentKey)

      const sessionAccount = await createCaliburSessionAccount({
        client: viemClient,
        signer: viemAccount,
        accountAddress: userAddress as Address,
        keyHash,
      })

      const bundlerClient = createBundlerClient({
        account: sessionAccount,
        paymaster: paymasterClient,
        client: viemClient,
        paymasterContext: {
          policyId: process.env.NEXT_PUBLIC_POLICY_ID,
        },
        transport: rpcTransport,
      })

      const usdcAmount = parseUnits(amount, 6)

      // Compute simulated price before sending the UserOp so we can mint the right amount
      const price = getSimulatedWethPrice()
      const wethReceivedStr = (Number.parseFloat(amount) / price).toFixed(8)
      const mockTokenAmount = parseUnits(wethReceivedStr, 18)

      const userOpHash = await bundlerClient.sendUserOperation({
        account: sessionAccount,
        calls: [
          {
            to: USDC_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: 'transfer',
              args: [WETH_TREASURY, usdcAmount],
            }),
          },
          {
            to: MOCK_ERC20_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: mintAbi,
              functionName: 'mint',
              args: [userAddress as Address, mockTokenAmount],
            }),
          },
        ],
      })

      const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash })
      const purchase = {
        timestamp: new Date(now).toISOString(),
        usdcSpent: amount,
        wethReceived: wethReceivedStr,
        price: price.toFixed(2),
        txHash: receipt.receipt.transactionHash,
      }

      const config = cached || {
        amount,
        frequency: 30,
        purchases: [],
        lastPurchase: 0,
        agentAddress: agentAddress as string,
        agentId,
      }
      config.purchases.push(purchase)
      config.lastPurchase = now
      await dcaStore.set(userAddress, config)

      results.push({ user: userAddress, userOpHash })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`DCA execute failed for ${userAddress}:`, message)
      results.push({ user: userAddress, error: message })
    }
  }

  return NextResponse.json({ executed: results.length, results })
}

/**
 * POST — Trigger immediate DCA execution for a single user (called after enabling DCA).
 * Authenticated via the user's Bearer token (not CRON_SECRET).
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { address } = body
  if (typeof address !== 'string' || address.length === 0) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  }

  try {
    await authorizeAddress(request, address)
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userAddress = address.toLowerCase()
  const config = await dcaStore.get(userAddress)
  if (!config?.agentId || !config?.agentAddress) {
    return NextResponse.json({ error: 'No DCA agent configured' }, { status: 400 })
  }

  const now = Date.now()
  const openfort = getOpenfort()
  const viemClient = getViemClient()
  const agentAddress = config.agentAddress as Address

  // Verify the agent key is active onchain
  const enabled = await isAgentEnabledOnchain(viemClient, userAddress as Address, agentAddress)
  if (!enabled) {
    return NextResponse.json({ error: 'Agent key not active onchain' }, { status: 400 })
  }

  try {
    const amount = config.amount ?? DEFAULT_AMOUNT

    const agent = await openfort.accounts.evm.backend.get({ id: config.agentId })
    const viemAccount = toAccount({
      address: agent.address,
      sign: async ({ hash }) => agent.sign({ hash }),
      signMessage: async ({ message }) => agent.signMessage({ message }),
      signTransaction: async (tx) => agent.signTransaction(tx),
      signTypedData: async (typedData) => agent.signTypedData(typedData),
    })

    const agentKey = {
      keyType: KeyType.Secp256k1,
      publicKey: padHex(agentAddress, { size: 32 }),
    }
    const keyHash = hashKey(agentKey)

    const sessionAccount = await createCaliburSessionAccount({
      client: viemClient,
      signer: viemAccount,
      accountAddress: userAddress as Address,
      keyHash,
    })

    const rpcUrl = getOpenfortRpcUrl()
    const rpcHeaders = getRpcHeaders()
    const rpcTransport = http(rpcUrl, { fetchOptions: { headers: rpcHeaders } })
    const paymasterClient = createPaymasterClient({ transport: rpcTransport })

    const bundlerClient = createBundlerClient({
      account: sessionAccount,
      paymaster: paymasterClient,
      client: viemClient,
      paymasterContext: {
        policyId: process.env.NEXT_PUBLIC_POLICY_ID,
      },
      transport: rpcTransport,
    })

    const usdcAmount = parseUnits(amount, 6)
    const price = getSimulatedWethPrice()
    const wethReceivedStr = (Number.parseFloat(amount) / price).toFixed(8)
    const mockTokenAmount = parseUnits(wethReceivedStr, 18)

    const userOpHash = await bundlerClient.sendUserOperation({
      account: sessionAccount,
      calls: [
        {
          to: USDC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [WETH_TREASURY, usdcAmount],
          }),
        },
        {
          to: MOCK_ERC20_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: mintAbi,
            functionName: 'mint',
            args: [userAddress as Address, mockTokenAmount],
          }),
        },
      ],
    })

    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash })
    const purchase = {
      timestamp: new Date(now).toISOString(),
      usdcSpent: amount,
      wethReceived: wethReceivedStr,
      price: price.toFixed(2),
      txHash: receipt.receipt.transactionHash,
    }

    config.purchases.push(purchase)
    config.lastPurchase = now
    await dcaStore.set(userAddress, config)

    return NextResponse.json({ success: true, userOpHash, purchase })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution failed'
    console.error('[DCA] Immediate execution failed for %s: %s', userAddress, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
