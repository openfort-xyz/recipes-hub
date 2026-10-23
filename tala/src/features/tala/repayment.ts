import { type Address, erc20Abi, isAddressEqual, parseEventLogs, type TransactionReceipt } from 'viem'

/**
 * How much USDC a mined transaction moved from `from` to `to`, read from its
 * Transfer logs. The repayment route trusts this, never an amount the browser
 * sends: a reverted transaction, another token or another recipient counts as 0.
 */
export function repaidAmount(
  receipt: Pick<TransactionReceipt, 'status' | 'logs'>,
  { token, from, to }: { token: Address; from: Address; to: Address }
): bigint {
  if (receipt.status !== 'success') return 0n
  return parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: receipt.logs })
    .filter(
      (log) =>
        isAddressEqual(log.address, token) && isAddressEqual(log.args.from, from) && isAddressEqual(log.args.to, to)
    )
    .reduce((sum, log) => sum + log.args.value, 0n)
}
