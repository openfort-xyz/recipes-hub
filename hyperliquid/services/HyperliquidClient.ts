import "../polyfills";
import * as Hyperliquid from "@nktkas/hyperliquid";
import { canonicalize, createL1ActionHash } from "@nktkas/hyperliquid/signing";
import { OrderRequest } from "@nktkas/hyperliquid/api/exchange";
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { encodeFunctionData, parseUnits } from "viem";

import type { ConnectedEmbeddedEthereumWallet } from "@openfort/react-native";
import type { L2BookResponse, FrontendOpenOrdersResponse } from "@nktkas/hyperliquid";

import {
  HYPE_ASSET_ID,
  HYPE_MARKET_ID,
  HYPE_SYMBOL,
  HYPERLIQUID_BRIDGE_ADDRESS,
  HYPERLIQUID_TESTNET_HTTP_URL,
  HYPERLIQUID_USDC_DECIMALS,
  HYPERLIQUID_USDC_TOKEN_ADDRESS,
  PRICE_POLL_INTERVAL_MS,
  DEFAULT_SLIPPAGE,
} from "../constants/hyperliquid";
import { CHAIN_IDS_HEX } from "../constants/network";

// Removed WebSocket transport - using HTTP transport for better React Native compatibility
const httpTransport = new Hyperliquid.HttpTransport({
  isTestnet: true,
});

const infoClient = new Hyperliquid.InfoClient({
    transport: httpTransport,
});

// Removed priceClient using WebSocket transport - using HTTP transport instead

const EXCHANGE_ENDPOINT = `${HYPERLIQUID_TESTNET_HTTP_URL}/exchange`;
const MAX_PRICE_DECIMALS_SPOT = 8;
const DEFAULT_HYPE_SZ_DECIMALS = 2;
const DEFAULT_HYPE_SIZE_STEP = Number((1 / Math.pow(10, DEFAULT_HYPE_SZ_DECIMALS)).toFixed(DEFAULT_HYPE_SZ_DECIMALS));
const DEFAULT_HYPE_PRICE_DECIMALS = MAX_PRICE_DECIMALS_SPOT - DEFAULT_HYPE_SZ_DECIMALS;

type HypeSizing = {
    szDecimals: number;
    priceDecimals: number;
    minSize: number;
    assetId: number | null;
};

const DEFAULT_HYPE_SIZING: HypeSizing = {
    szDecimals: DEFAULT_HYPE_SZ_DECIMALS,
    priceDecimals: DEFAULT_HYPE_PRICE_DECIMALS,
    minSize: DEFAULT_HYPE_SIZE_STEP,
    assetId: HYPE_ASSET_ID,
};

export const DEFAULT_MIN_HYPE_ORDER_SIZE = DEFAULT_HYPE_SIZING.minSize;
const IS_TESTNET = HYPERLIQUID_TESTNET_HTTP_URL.toLowerCase().includes("testnet");

type OrderWire = {
    a: number;
    b: boolean;
    p: string;
    s: string;
    r: boolean;
    t: { limit: { tif: "Gtc" } };
};

// The embedded wallet as exposed by `useEmbeddedEthereumWallet().activeWallet`.
// Only the two members this module actually needs.
export type EmbeddedWallet = Pick<ConnectedEmbeddedEthereumWallet, "address" | "getProvider">;

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
] as const;

let hypeSizingPromise: Promise<HypeSizing> | null = null;

const FILL_LOOKBACK_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const ORDER_BOOK_SIG_FIGS = 4;

export type OrderPlacementResult =
    | {
        status: "filled";
        side: "buy" | "sell";
        orderId: number;
        avgPrice: string;
        totalSize: string;
        requestedPrice: string;
        requestedSize: string;
        timestamp: number;
    }
    | {
        status: "resting";
        side: "buy" | "sell";
        orderId: number;
        requestedPrice: string;
        requestedSize: string;
        timestamp: number;
    };

const fetchRecentFillForOrder = async (
    userAddress: string | undefined,
    oid: number
) => {
    if (!userAddress) {
        return null;
    }

    try {
        const startTime = Math.max(0, Date.now() - FILL_LOOKBACK_WINDOW_MS);
        const fills = await infoClient.userFillsByTime({
            user: userAddress as `0x${string}`,
            startTime,
            aggregateByTime: false,
        });

        const matchedFill = fills.find((fill) => fill.oid === oid);
        if (matchedFill) {
            console.log('Matched fill details for order:', {
                coin: matchedFill.coin,
                price: matchedFill.px,
                size: matchedFill.sz,
                fee: matchedFill.fee,
                feeToken: matchedFill.feeToken,
                txHash: matchedFill.hash,
                timestamp: new Date(matchedFill.time).toISOString(),
            });
        } else {
            console.warn(`No fill record found for order oid ${oid} within ${FILL_LOOKBACK_WINDOW_MS / 1000}s window.`);
        }

        return matchedFill ?? null;
    } catch (error) {
        console.warn('Unable to fetch recent fill details:', error);
        return null;
    }
};

const fetchHypeSizing = async (): Promise<HypeSizing> => {
    try {
        const spotMeta = await infoClient.spotMeta();
        const token = spotMeta.tokens.find((t) => t.index === 1035);
        if (!token) {
            throw new Error('HYPE token metadata not found in spotMeta response');
        }

        const szDecimals = typeof token.szDecimals === 'number' ? Math.max(0, token.szDecimals) : DEFAULT_HYPE_SIZING.szDecimals;
        const priceDecimals = Math.max(0, MAX_PRICE_DECIMALS_SPOT - szDecimals);
        const minSize = Number((1 / Math.pow(10, szDecimals)).toFixed(szDecimals));

        const assetId = typeof token.index === 'number' ? 10000 + token.index : HYPE_ASSET_ID;
        if (assetId !== HYPE_ASSET_ID) {
            console.log(`Resolved dynamic HYPE asset id ${assetId} (token index ${token.index})`);
        }

        return {
            szDecimals,
            priceDecimals,
            minSize,
            assetId,
        };
    } catch (error) {
        console.warn('Failed to fetch HYPE sizing metadata, falling back to defaults:', error);
        return DEFAULT_HYPE_SIZING;
    }
};

const getHypeSizing = async (): Promise<HypeSizing> => {
    if (!hypeSizingPromise) {
        hypeSizingPromise = fetchHypeSizing();
    }

    try {
        return await hypeSizingPromise;
    } catch (error) {
        hypeSizingPromise = null;
        throw error;
    }
};

// Signs a Hyperliquid L1 action through the embedded wallet's EIP-1193 provider.
// `@nktkas/hyperliquid` 0.25+ dropped `actionSorter`; `canonicalize` (schema-driven
// key reordering) is the replacement, since `createL1ActionHash` hashes the action
// object in insertion-key order.
const signAndSubmitOrder = async (
    params: {
        activeWallet: EmbeddedWallet;
        action: Record<string, unknown>;
    }
) => {
    const { activeWallet, action } = params;
    const nonce = Date.now();
    const actionHash = createL1ActionHash({ action, nonce });

    const domain = {
        name: "Exchange",
        version: "1",
        chainId: 1337,
        verifyingContract: "0x0000000000000000000000000000000000000000",
    };

    const types = {
        Agent: [
            { name: "source", type: "string" },
            { name: "connectionId", type: "bytes32" },
        ],
    };

    const message = {
        source: IS_TESTNET ? "b" : "a",
        connectionId: actionHash,
    };

    const provider = await activeWallet.getProvider();
    const signatureHex = (await provider.request({
        method: "eth_signTypedData_v4",
        params: [
            activeWallet.address,
            JSON.stringify({ domain, types, primaryType: "Agent", message }),
        ],
    })) as string;

    console.log('Signed order hex:', signatureHex);

    const signature = ethers.Signature.from(signatureHex);
    const signatureWire = {
        r: signature.r,
        s: signature.s,
        v: signature.v,
    };

    console.log('Parsed signature:', signatureWire);

    const response = await fetch(EXCHANGE_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            action,
            signature: signatureWire,
            nonce,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    return await response.json();
};

// HYPE/USDC price
export const useHypeUsdc = (intervalMs = PRICE_POLL_INTERVAL_MS) => {
    const [price, setPrice] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const fetchPrice = async () => {
            if (!isMountedRef.current) {
                return;
            }

            try {
                // Use HTTP transport instead of WebSocket for better reliability in React Native
                const allMids = await infoClient.allMids();
                const value = allMids[HYPE_MARKET_ID];
                if (!value) {
                    throw new Error(`Asset ${HYPE_MARKET_ID} not found`);
                }
                if (!isMountedRef.current) {
                    return;
                }
                setPrice(Number(value));
                setError(null);
                setHasLoaded(true);
            } catch (err) {
                if (!isMountedRef.current) {
                    return;
                }
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
            }
        };

        fetchPrice();
        const interval = setInterval(fetchPrice, intervalMs);

        return () => clearInterval(interval);
    }, [intervalMs]);

    return { price, isLoading: hasLoaded ? false : isLoading, error };
};

export const useHypeOrderBook = (intervalMs = PRICE_POLL_INTERVAL_MS) => {
    const [book, setBook] = useState<L2BookResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const fetchOrderBook = async () => {
            if (!isMountedRef.current) {
                return;
            }

            try {
                const snapshot = await infoClient.l2Book({
                    coin: HYPE_SYMBOL,
                    nSigFigs: ORDER_BOOK_SIG_FIGS,
                });

                if (!isMountedRef.current) {
                    return;
                }

                setBook(snapshot);
                setError(null);
                setHasLoaded(true);
            } catch (err) {
                if (!isMountedRef.current) {
                    return;
                }

                console.error('Failed to fetch Hyperliquid order book:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
            }
        };

        fetchOrderBook();
        const interval = setInterval(fetchOrderBook, intervalMs);

        return () => {
            clearInterval(interval);
        };
    }, [intervalMs]);

    return { book, isLoading: hasLoaded ? false : isLoading, error };
};

export const useHypeOpenOrders = (
    address: `0x${string}` | undefined,
    intervalMs = PRICE_POLL_INTERVAL_MS
) => {
    const [orders, setOrders] = useState<FrontendOpenOrdersResponse>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const fetchOpenOrders = useCallback(async () => {
        if (!isMountedRef.current) {
            return;
        }

        if (!address) {
            setOrders([]);
            setError(null);
            setHasLoaded(false);
            setIsLoading(false);
            return;
        }

        try {
            const response = await infoClient.frontendOpenOrders({ user: address });
            if (!isMountedRef.current) {
                return;
            }

            setOrders(Array.isArray(response) ? [...response] : []);
            setError(null);
            setHasLoaded(true);
        } catch (err) {
            if (!isMountedRef.current) {
                return;
            }
            console.error('Failed to fetch Hyperliquid open orders:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [address]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount + interval poll; this recipe's data layer is custom hooks, not a query library.
        fetchOpenOrders();

        if (!address) {
            return undefined;
        }

        const interval = setInterval(() => {
            fetchOpenOrders();
        }, intervalMs);

        return () => {
            clearInterval(interval);
        };
    }, [address, intervalMs, fetchOpenOrders]);

    return {
        orders,
        isLoading: hasLoaded ? false : isLoading,
        error,
        refetch: fetchOpenOrders,
    };
};

// Hyperliquid account + positions balances
export const useHypeBalances = (address: `0x${string}` | undefined) => {
    const [balances, setBalances] = useState<{ account: any; positions: any } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBalances = useCallback(async () => {
        if (!address) {
            setBalances(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const clearinghouseState = await infoClient.spotClearinghouseState({
                user: address,
            });

            const usdcBalance = clearinghouseState?.balances?.find((b: any) => b.coin === "USDC");
            const hypeBalance = clearinghouseState?.balances?.find((b: any) => b.coin === HYPE_SYMBOL);
            const usdcTotal = usdcBalance ? usdcBalance.total : null;

            const accountData = {
                usdcBalance: usdcTotal,
                assetPositions: clearinghouseState?.balances || []
            };

            const positionsData = {
                totalValue: 0,
                openPositions: [],
                unrealizedPnl: 0,
                hypePosition: hypeBalance
                    ? {
                        coin: HYPE_SYMBOL,
                        total: hypeBalance.total || "0",
                        hold: hypeBalance.hold || "0",
                        entryNtl: hypeBalance.entryNtl || "0",
                    }
                    : null,
            };

            setBalances({
                account: accountData,
                positions: positionsData
            });
            setError(null);
        } catch (err) {
            console.error("Failed to fetch Hyperliquid balances:", err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [address]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; this recipe's data layer is custom hooks, not a query library.
        fetchBalances();
    }, [fetchBalances]);

    return { balances, isLoading, error, refetch: fetchBalances };
};

// Transfer USDC to Hyperliquid: a plain ERC-20 transfer of the bridge's accepted
// USDC to Hyperliquid's testnet Bridge2 contract on Arbitrum Sepolia. The bridge
// credits whichever address sent the transfer, in under a minute, for amounts
// >= 5 USDC (smaller amounts are not credited and are unrecoverable).
export const transfer = async (
    activeWallet: EmbeddedWallet,
    amount: number
): Promise<boolean> => {
    try {
        const units = parseUnits(amount.toString(), HYPERLIQUID_USDC_DECIMALS);
        const data = encodeFunctionData({
            abi: ERC20_TRANSFER_ABI,
            functionName: "transfer",
            args: [HYPERLIQUID_BRIDGE_ADDRESS, units],
        });

        const provider = await activeWallet.getProvider();
        await provider.request({
            method: "wallet_sendCalls",
            params: [
                {
                    version: "1.0",
                    chainId: CHAIN_IDS_HEX.ARBITRUM_SEPOLIA,
                    from: activeWallet.address,
                    calls: [{ to: HYPERLIQUID_USDC_TOKEN_ADDRESS, value: "0x0", data }],
                },
            ],
        });

        return true;
    } catch (error) {
        console.error('Transfer to Hyperliquid failed:', error);
        throw error;
    }
};

const buildOrderWire = (
    assetId: number,
    isBuy: boolean,
    price: string,
    size: string
): OrderWire => ({
    a: assetId,
    b: isBuy,
    p: price,
    s: size,
    r: false,
    t: {
        limit: { tif: "Gtc" },
    },
});

const submitOrder = async (
    activeWallet: EmbeddedWallet,
    orderWire: OrderWire,
    side: "buy" | "sell"
): Promise<OrderPlacementResult> => {
    const action = canonicalize(OrderRequest.entries.action, {
        type: "order",
        orders: [orderWire],
        grouping: "na",
    });
    console.log('Final action structure:', JSON.stringify(action, null, 2));

    const result = await signAndSubmitOrder({ activeWallet, action });
    console.log(`${side === "buy" ? "Buy" : "Sell"} order result:`, result);

    if (result.response?.type === 'order') {
        const statuses = result.response.data.statuses;
        const firstStatus = statuses[0];

        if ('filled' in firstStatus) {
            console.log('Order filled successfully!');
            console.log('- Filled size:', firstStatus.filled.totalSz);
            console.log('- Average price:', firstStatus.filled.avgPx);
            await fetchRecentFillForOrder(activeWallet.address, firstStatus.filled.oid);
            return {
                status: 'filled',
                side,
                orderId: firstStatus.filled.oid,
                avgPrice: firstStatus.filled.avgPx,
                totalSize: firstStatus.filled.totalSz,
                requestedPrice: orderWire.p,
                requestedSize: orderWire.s,
                timestamp: Date.now(),
            };
        }
        if ('resting' in firstStatus) {
            console.log('Order placed but not filled immediately');
            console.log('- Order ID:', firstStatus.resting.oid);
            return {
                status: 'resting',
                side,
                orderId: firstStatus.resting.oid,
                requestedPrice: orderWire.p,
                requestedSize: orderWire.s,
                timestamp: Date.now(),
            };
        }
        if ('error' in firstStatus) {
            throw new Error(`Order failed: ${firstStatus.error}`);
        }
    }

    throw new Error(`Unexpected order response format: ${JSON.stringify(result)}`);
};

// Buy HYPE using USDC on Hyperliquid
export const buy = async (
    activeWallet: EmbeddedWallet,
    amount: number,
    slippage: number = DEFAULT_SLIPPAGE
): Promise<OrderPlacementResult> => {
    try {
        console.log('Attempting to buy HYPE with', amount, 'USDC');

        const allMids = await infoClient.allMids();
        const hypePrice = allMids[HYPE_MARKET_ID];
        if (!hypePrice) {
            throw new Error('HYPE price not found in market data');
        }

        const { szDecimals, minSize, assetId } = await getHypeSizing();
        const assetIdForOrder = assetId ?? HYPE_ASSET_ID;

        const buyPriceRaw = parseFloat(hypePrice) * (1 + slippage);
        // Force 3 decimal places for tick size compatibility
        const tickDecimals = 3;
        const priceScale = Math.pow(10, tickDecimals);
        const buyPriceRounded = Math.round(buyPriceRaw * priceScale) / priceScale;
        const buyPrice = Math.max(buyPriceRounded, buyPriceRaw); // ensure we don't undercut mid
        const buyPriceStr = buyPrice
            .toFixed(tickDecimals)
            .replace(/\.0+$/, '')
            .replace(/(\.\d*[1-9])0+$/, '$1');

        const minNotional = buyPrice * minSize;
        if (amount < minNotional) {
            throw new Error(
                `Order size too small. Hyperliquid requires at least ${minSize} ${HYPE_SYMBOL} (~${minNotional.toFixed(2)} USDC at current price).`
            );
        }

        const rawQuantity = amount / buyPrice;
        let quantity = Number(rawQuantity.toFixed(szDecimals));
        if (quantity < minSize) {
            quantity = minSize;
        }

        const quantityStr = quantity
            .toFixed(szDecimals)
            .replace(/\.0+$/, '')
            .replace(/(\.\d*[1-9])0+$/, '$1');

        console.log('Calculated buy order:', { midPrice: hypePrice, buyPriceStr, quantityStr, assetIdForOrder });

        const orderWire = buildOrderWire(assetIdForOrder, true, buyPriceStr, quantityStr);
        return await submitOrder(activeWallet, orderWire, 'buy');
    } catch (error) {
        console.error('Buy HYPE failed:', error);
        throw error;
    }
};

// Sell HYPE using USDC on Hyperliquid
export const sell = async (
    activeWallet: EmbeddedWallet,
    amount: number,
    slippage: number = DEFAULT_SLIPPAGE
): Promise<OrderPlacementResult> => {
    try {
        console.log('Attempting to sell', amount, 'HYPE');

        const allMids = await infoClient.allMids();
        const hypePrice = allMids[HYPE_MARKET_ID];
        if (!hypePrice) {
            throw new Error('HYPE price not found in market data');
        }

        const { szDecimals, minSize, assetId } = await getHypeSizing();
        const assetIdForOrder = assetId ?? HYPE_ASSET_ID;

        const sellPriceRaw = parseFloat(hypePrice) * (1 - slippage);
        // Force 3 decimal places for tick size compatibility (observed from working buy orders)
        const tickDecimals = 3;
        const priceScale = Math.pow(10, tickDecimals);
        const sellPriceRounded = Math.round(sellPriceRaw * priceScale) / priceScale;
        const sellPrice = Math.max(sellPriceRounded, sellPriceRaw);
        const sellPriceStr = sellPrice
            .toFixed(tickDecimals)
            .replace(/\.0+$/, '')
            .replace(/(\.\d*[1-9])0+$/, '$1');

        if (amount < minSize) {
            throw new Error(`Order size too small. Hyperliquid requires at least ${minSize} ${HYPE_SYMBOL} per order.`);
        }

        const quantity = Number(amount.toFixed(szDecimals));
        const quantityStr = quantity
            .toFixed(szDecimals)
            .replace(/\.0+$/, '')
            .replace(/(\.\d*[1-9])0+$/, '$1');

        console.log('Calculated sell order:', { midPrice: hypePrice, sellPriceStr, quantityStr, assetIdForOrder });

        const orderWire = buildOrderWire(assetIdForOrder, false, sellPriceStr, quantityStr);
        return await submitOrder(activeWallet, orderWire, 'sell');
    } catch (error) {
        console.error('Sell HYPE failed:', error);
        throw error;
    }
};
