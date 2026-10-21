// The wallet has sent USDC to TALA_REPAYMENT_ADDRESS. Verify the transfer
// on-chain, then notify Tala. Nothing about the amount is taken from the
// request: it is read from the transaction's Transfer logs.

import { type Address, createPublicClient, formatUnits, http, isHash } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { currency, getLoan, notifyRepayment, TalaError } from '@/features/tala/client'
import { PHONE_REGEX, USDC_ADDRESS, USDC_DECIMALS } from '@/features/tala/constants'
import { repaidAmount } from '@/features/tala/repayment'
import { authorizeAddress, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const chainId = Number.parseInt(process.env.NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID ?? '84532', 10)
const publicClient = createPublicClient({ chain: chainId === base.id ? base : baseSepolia, transport: http() })

export async function POST(req: Request) {
  try {
    const { address, txHash, phoneNumber } = (await req.json()) as {
      address: Address
      txHash: string
      phoneNumber: string
    }
    const { user } = await authorizeAddress(req, address)
    const repaymentAddress = process.env.TALA_REPAYMENT_ADDRESS as Address | undefined
    if (!repaymentAddress) throw new TalaError('TALA_REPAYMENT_ADDRESS is not configured', 500)
    if (!isHash(txHash)) throw new TalaError('Invalid transaction hash', 400)
    if (!PHONE_REGEX.test(phoneNumber ?? ''))
      throw new TalaError('Enter the phone number as +<country code><number>', 400)

    const loan = await getLoan(user.id)
    if (!loan) throw new TalaError('No active loan to repay', 404)

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
    const paid = repaidAmount(receipt, {
      token: USDC_ADDRESS[publicClient.chain.id],
      from: address,
      to: repaymentAddress,
    })
    if (paid === 0n) throw new TalaError('That transaction sent no USDC from your wallet to the repayment address', 400)
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber })

    // shortcut: replay protection relies on Tala rejecting a repeated externalTransactionId (the mock does);
    // confirm with Tala, or record notified hashes yourself, before production.
    await notifyRepayment(user.id, {
      msisdn: phoneNumber,
      amount: { amount: Number(formatUnits(paid, USDC_DECIMALS)), isoCode: currency() },
      txHash,
      transactionTime: new Date(Number(block.timestamp) * 1_000).toISOString(),
      loanId: loan.loanId,
    })
    return Response.json({ loan: await getLoan(user.id) })
  } catch (err) {
    return errorResponse(err)
  }
}
