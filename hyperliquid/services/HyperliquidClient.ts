import "../polyfills";
import * as Hyperliquid from "@nktkas/hyperliquid";
import { createL1ActionHash } from "@nktkas/hyperliquid/signing";
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";

import type { FrontendOpenOrdersResponse, L2BookResponse } from "@nktkas/hyperliquid/api/info";

import {
  HYPE_ASSET_ID,
  HYPE_MARKET_ID,
  HYPE_SYMBOL,
  HYPERLIQUID_TESTNET_HTTP_URL,
  PRICE_POLL_INTERVAL_MS,
  DEFAULT_SLIPPAGE,
} from "../constants/hyperliquid";

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

// @nktkas/hyperliquid 0.32 removed `actionSorter`; the order action is a plain
// object built in Hyperliquid's canonical field order (a, b, p, s, r, t), which
// is what `createL1ActionHash` hashes over.
type OrderWire = {
  a: number;
  b: boolean;
  p: string;
  s: string;
  r: boolean;
  t: { limit: { tif: "Gtc" } };
};
type OrderAction = { type: "order"; orders: OrderWire[]; grouping: "na" };

type EmbeddedWalletSigner = {
    signTypedData?: (
        domain: Record<string, unknown>,
        types: Record<string, Array<{ name: string; type: string }>>,
        message: Record<string, unknown>
    ) => Promise<string>;
    exportPrivateKey?: () => Promise<string>;
};

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

        const matchedFill = fills.find((fill: any) => fill.oid === oid);
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
        const token = spotMeta.tokens.find((t: any) => t.index === 1035);
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

const signAndSubmitOrder = async (
    params: {
        activeWallet: any;
        action: OrderAction;
        embeddedWallet?: EmbeddedWalletSigner;
        privateKey?: string | null;
    }
) => {
    const { activeWallet, action, embeddedWallet, privateKey } = params;
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

    let signatureHex: string | undefined;

    if (privateKey) {
        const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        const wallet = new ethers.Wallet(normalizedKey);
        signatureHex = await wallet.signTypedData(domain, types, message);
    } else if (embeddedWallet?.signTypedData) {
        signatureHex = await embeddedWallet.signTypedData(
            domain,
            {
                EIP712Domain: [
                    { name: "name", type: "string" },
                    { name: "version", type: "string" },
                    { name: "chainId", type: "uint256" },
                    { name: "verifyingContract", type: "address" },
                ],
                ...types,
            },
            message
        );
    } else {
        const provider = await activeWallet.getProvider();
        try {
            signatureHex = await provider.request({
                method: 'eth_signTypedData_v4',
                params: [
                    activeWallet.address,
                    JSON.stringify({
                        domain,
                        types,
                        primaryType: 'Agent',
                        message,
                    }),
                ],
            });
        } catch (error: any) {
            const errMessage = error?.message ?? 'Unknown provider error';
            throw new Error(`Unable to sign Hyperliquid order: ${errMessage}`);
        }
    }

    if (!signatureHex) {
        throw new Error('Failed to obtain signature for Hyperliquid order');
    }

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
    const hasLoadedRef = useRef(false);
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

            if (!hasLoadedRef.current) {
                setIsLoading(true);
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
                hasLoadedRef.current = true;
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

        // Initial fetch
        fetchPrice();

        // Set up interval for subsequent fetches
        const interval = setInterval(fetchPrice, intervalMs);

        return () => clearInterval(interval);
    }, [intervalMs]);

    return { price, isLoading: !hasLoadedRef.current ? isLoading : false, error };
};

export const useHypeOrderBook = (intervalMs = PRICE_POLL_INTERVAL_MS) => {
    const [book, setBook] = useState<L2BookResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);
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

            if (!hasLoadedRef.current) {
                setIsLoading(true);
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
                hasLoadedRef.current = true;
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

    return { book, isLoading: !hasLoadedRef.current ? isLoading : false, error };
};

export const useHypeOpenOrders = (
    address: `0x${string}` | undefined,
    intervalMs = PRICE_POLL_INTERVAL_MS
) => {
    const [orders, setOrders] = useState<FrontendOpenOrdersResponse>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);
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
            hasLoadedRef.current = false;
            setIsLoading(false);
            return;
        }

        if (!hasLoadedRef.current) {
            setIsLoading(true);
        }

        try {
            const response = await infoClient.frontendOpenOrders({ user: address });
            if (!isMountedRef.current) {
                return;
            }

            const nextOrders = Array.isArray(response)
                ? response.map((order) => ({ ...order }))
                : [];

            setOrders(nextOrders);
            setError(null);
            hasLoadedRef.current = true;
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
        const run = async () => {
            await fetchOpenOrders();
        };

        run();

        if (!address) {
            return undefined;
        }

        const interval = setInterval(() => {
            run();
        }, intervalMs);

        return () => {
            clearInterval(interval);
        };
    }, [address, intervalMs, fetchOpenOrders]);

    return {
        orders,
        isLoading: !hasLoadedRef.current ? isLoading : false,
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
        fetchBalances();
    }, [fetchBalances]);

    return { balances, isLoading, error, refetch: fetchBalances };
};

// Transfer USDC to Hyperliquid
export const transfer = async (
    activeWallet: any,
    amount: number
): Promise<boolean> => {
    /*
     * Reference implementation (from commit 46ad2404644658f40c20d0a5f8a3b0bdc2b565f5^)
     * kept for easy copy/paste when wiring real transfers:
     *
     * try {
     *   // Use hardcoded private key
     *   const privateKey = "";
     *
     *   // Create exchange client with testnet flag
     *   const exchangeClient = new Hyperliquid.ExchangeClient({
     *     wallet: privateKey,
     *     transport: new Hyperliquid.HttpTransport({ isTestnet: true })
     *   });
     *
     *   // TODO: invoke exchangeClient to submit deposit transaction
     *   return true;
     * } catch (error) {
     *   console.error('Transfer to Hyperliquid failed:', error);
     *   throw error;
     * }
     */

    // Transfer functionality to be implemented
    console.log('Transfer function called with:', { activeWallet: activeWallet.address, amount });
    return false;
};

// Buy HYPE using USDC on Hyperliquid
export const buy = async (
    activeWallet: any,
    amount: number,
    slippage: number = DEFAULT_SLIPPAGE,
    options?: { openfortClient?: { embeddedWallet?: EmbeddedWalletSigner } }
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
        console.log('HYPE sizing details:', { szDecimals, minSize, assetId: assetIdForOrder });

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
        console.log('Raw quantity before rounding:', rawQuantity);
        let quantity = Number(rawQuantity.toFixed(szDecimals));
        console.log('Quantity after rounding to szDecimals:', quantity);
        if (quantity < minSize) {
            quantity = minSize;
            console.log('Quantity adjusted to minSize:', quantity);
        }

        const quantityStr = quantity
            .toFixed(szDecimals)
            .replace(/\.0+$/, '')
            .replace(/(\.\d*[1-9])0+$/, '$1');
        console.log('Final quantity string for order:', quantityStr);

        console.log('Calculated buy order:');
        console.log('- Mid price:', parseFloat(hypePrice).toFixed(6), 'USDC');
        console.log('- Buy price (with slippage):', buyPriceStr, 'USDC');
        console.log('- Quantity:', quantityStr, 'HYPE');
        console.log('- Asset ID:', assetIdForOrder);

        const orderWire = {
            a: assetIdForOrder,
            b: true,
            p: buyPriceStr,
            s: quantityStr,
            r: false,
            t: {
                limit: { tif: "Gtc" as const },
            },
        };
        console.log('Order wire structure:', JSON.stringify(orderWire, null, 2));

        const embeddedWallet = options?.openfortClient?.embeddedWallet;

        let result;
        let privateKeyHex: string | null = null;

        if (typeof activeWallet.getPrivateKey === 'function') {
            try {
                privateKeyHex = await activeWallet.getPrivateKey();
            } catch (err) {
                console.warn('activeWallet.getPrivateKey failed, will try other signing paths:', err);
                privateKeyHex = null;
            }
        }

        if (!privateKeyHex && embeddedWallet?.exportPrivateKey) {
            try {
                privateKeyHex = await embeddedWallet.exportPrivateKey();
            } catch (err) {
                console.warn('embeddedWallet.exportPrivateKey failed, falling back to direct signing:', err);
                privateKeyHex = null;
            }
        }

        const action: OrderAction = {
            type: "order",
            orders: [orderWire],
            grouping: "na",
        };
        console.log('Final action structure:', JSON.stringify(action, null, 2));

        result = await signAndSubmitOrder({
            activeWallet,
            action,
            embeddedWallet,
            privateKey: privateKeyHex,
        });

        console.log('Buy order result:', result);

        // Handle the exchange response
        if (result.response?.type === 'order') {
            const statuses = result.response.data.statuses;
            const firstStatus = statuses[0];

            if ('filled' in firstStatus) {
                console.log('Order filled successfully!');
                console.log('- Filled size:', firstStatus.filled.totalSz);
                console.log('- Average price:', firstStatus.filled.avgPx);
                await fetchRecentFillForOrder(activeWallet?.address, firstStatus.filled.oid);
                const timestamp = Date.now();
                return {
                    status: 'filled',
                    side: 'buy',
                    orderId: firstStatus.filled.oid,
                    avgPrice: firstStatus.filled.avgPx,
                    totalSize: firstStatus.filled.totalSz,
                    requestedPrice: buyPriceStr,
                    requestedSize: quantityStr,
                    timestamp,
                };
            } else if ('resting' in firstStatus) {
                console.log('Order placed but not filled immediately');
                console.log('- Order ID:', firstStatus.resting.oid);
                const timestamp = Date.now();
                return {
                    status: 'resting',
                    side: 'buy',
                    orderId: firstStatus.resting.oid,
                    requestedPrice: buyPriceStr,
                    requestedSize: quantityStr,
                    timestamp,
                };
            } else if ('error' in firstStatus) {
                throw new Error(`Order failed: ${firstStatus.error}`);
            }
        }

        throw new Error(`Unexpected order response format: ${JSON.stringify(result)}`);

    } catch (error) {
        console.error('Buy HYPE failed:', error);
        throw error;
    }
};

// Sell HYPE using USDC on Hyperliquid
export const sell = async (
    activeWallet: any,
    amount: number,
    slippage: number = DEFAULT_SLIPPAGE,
    options?: { openfortClient?: { embeddedWallet?: EmbeddedWalletSigner } }
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

        console.log('Price calculation for sell:');
        console.log('- Raw sell price:', sellPriceRaw);
        console.log('- Rounded to', tickDecimals, 'decimals:', sellPriceRounded);
        console.log('- Final price string:', sellPriceStr);

        if (amount < minSize) {
            throw new Error(`Order size too small. Hyperliquid requires at least ${minSize} ${HYPE_SYMBOL} per order.`);
        }

        const quantity = Number(amount.toFixed(szDecimals));
        const quantityStr = quantity
            .toFixed(szDecimals)
            .replace(/\.0+$/, '')
            .replace(/(\.\d*[1-9])0+$/, '$1');

        console.log('Calculated sell order:');
        console.log('- Mid price:', parseFloat(hypePrice).toFixed(6), 'USDC');
        console.log('- Sell price (with slippage):', sellPriceStr, 'USDC');
        console.log('- Asset ID:', assetIdForOrder);
        console.log('- Quantity:', quantityStr, 'HYPE');

        const orderWire = {
            a: assetIdForOrder,
            b: false,
            p: sellPriceStr,
            s: quantityStr,
            r: false,
            t: {
                limit: { tif: "Gtc" as const },
            },
        };

        const embeddedWallet = options?.openfortClient?.embeddedWallet;

        let result;
        let privateKeyHex: string | null = null;

        if (typeof activeWallet.getPrivateKey === 'function') {
            try {
                privateKeyHex = await activeWallet.getPrivateKey();
            } catch (err) {
                console.warn('activeWallet.getPrivateKey failed, will try other signing paths:', err);
                privateKeyHex = null;
            }
        }

        if (!privateKeyHex && embeddedWallet?.exportPrivateKey) {
            try {
                privateKeyHex = await embeddedWallet.exportPrivateKey();
            } catch (err) {
                console.warn('embeddedWallet.exportPrivateKey failed, falling back to direct signing:', err);
                privateKeyHex = null;
            }
        }

        const action: OrderAction = {
            type: "order",
            orders: [orderWire],
            grouping: "na",
        };
        console.log('Final action structure:', JSON.stringify(action, null, 2));

        result = await signAndSubmitOrder({
            activeWallet,
            action,
            embeddedWallet,
            privateKey: privateKeyHex,
        });

        console.log('Sell order result:', result);

        // Handle the exchange response
        if (result.response?.type === 'order') {
            const statuses = result.response.data.statuses;
            const firstStatus = statuses[0];

            if ('filled' in firstStatus) {
                console.log('Sell order filled successfully!');
                console.log('- Filled size:', firstStatus.filled.totalSz);
                console.log('- Average price:', firstStatus.filled.avgPx);
                await fetchRecentFillForOrder(activeWallet?.address, firstStatus.filled.oid);
                const timestamp = Date.now();
                return {
                    status: 'filled',
                    side: 'sell',
                    orderId: firstStatus.filled.oid,
                    avgPrice: firstStatus.filled.avgPx,
                    totalSize: firstStatus.filled.totalSz,
                    requestedPrice: sellPriceStr,
                    requestedSize: quantityStr,
                    timestamp,
                };
            } else if ('resting' in firstStatus) {
                console.log('Sell order placed but not filled immediately');
                console.log('- Order ID:', firstStatus.resting.oid);
                const timestamp = Date.now();
                return {
                    status: 'resting',
                    side: 'sell',
                    orderId: firstStatus.resting.oid,
                    requestedPrice: sellPriceStr,
                    requestedSize: quantityStr,
                    timestamp,
                };
            } else if ('error' in firstStatus) {
                throw new Error(`Sell order failed: ${firstStatus.error}`);
            }
        }

        throw new Error(`Unexpected sell order response format: ${JSON.stringify(result)}`);

    } catch (error) {
        console.error('Sell HYPE failed:', error);
        throw error;
    }
};
