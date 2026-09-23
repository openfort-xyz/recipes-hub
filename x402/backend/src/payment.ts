import { randomBytes } from "node:crypto";
import type { EvmAccount, Openfort } from "@openfort/openfort-node";
import { getCdpJwt } from "./cdp-auth.js";
import {
	createPublicClient,
	encodeFunctionData,
	erc20Abi,
	getAddress,
	http,
	parseEventLogs,
	verifyTypedData,
	type Address,
	type Hex,
} from "viem";
import type { Config } from "./config.js";

// ---- Network types ----

export const NETWORK_CHAIN_ID = {
	"base-sepolia": 84532,
	base: 8453,
} as const;

export type SupportedNetwork = keyof typeof NETWORK_CHAIN_ID;

/** CAIP-2 network IDs for Coinbase CDP facilitator. Explicit mapping only — no fallthrough. */
const CAIP2_NETWORK: Record<SupportedNetwork, string> = {
	"base-sepolia": "eip155:84532",
	base: "eip155:8453",
};

function toCaip2Network(network: SupportedNetwork): string {
	return CAIP2_NETWORK[network];
}

// ---- Payment types ----

export interface PaymentRequirements {
	x402Version: 2;
	scheme: "exact";
	network: SupportedNetwork;
	maxAmountRequired: string;
	resource: string;
	description: string;
	mimeType: string;
	payTo: Address;
	maxTimeoutSeconds: number;
	asset: Address;
	extra?: {
		name?: string;
		version?: string;
	};
}

export interface ExactEvmPayloadAuthorization {
	from: Address;
	to: Address;
	value: string;
	validAfter: string;
	validBefore: string;
	nonce: Hex;
}

export interface ExactEvmPayload {
	signature: Hex;
	authorization: ExactEvmPayloadAuthorization;
}

export interface PaymentPayload {
	x402Version: 2;
	scheme: "exact";
	network: SupportedNetwork;
	payload: ExactEvmPayload;
}

// ---- EIP-712 types ----

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
	TransferWithAuthorization: [
		{ name: "from", type: "address" },
		{ name: "to", type: "address" },
		{ name: "value", type: "uint256" },
		{ name: "validAfter", type: "uint256" },
		{ name: "validBefore", type: "uint256" },
		{ name: "nonce", type: "bytes32" },
	],
} as const;

// ---- Error ----

export class PaymentVerificationError extends Error {
	constructor(
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "PaymentVerificationError";
	}
}

export class FacilitatorError extends Error {
	constructor(
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "FacilitatorError";
	}
}

// ---- Replay protection ----
// NOTE: Use Redis/DB in production

const usedNonces = new Set<string>();
const usedTxHashes = new Set<string>();

export async function verifyOnChainPayment(
	txHash: string,
	paywall: Config["paywall"],
	rpcUrl: string,
): Promise<void> {
	const normalizedHash = txHash.toLowerCase();
	if (usedTxHashes.has(normalizedHash)) {
		throw new PaymentVerificationError(
			"REPLAY",
			"Transaction hash already used",
		);
	}

	const client = createPublicClient({ transport: http(rpcUrl) });

	let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>>;
	try {
		receipt = await client.getTransactionReceipt({ hash: txHash as Hex });
	} catch {
		throw new PaymentVerificationError(
			"TX_NOT_FOUND",
			"Transaction not found on-chain",
		);
	}

	if (receipt.status !== "success") {
		throw new PaymentVerificationError(
			"TX_FAILED",
			"Transaction did not succeed",
		);
	}

	const logs = parseEventLogs({
		abi: erc20Abi,
		eventName: "Transfer",
		logs: receipt.logs,
	});

	const payTo = getAddress(paywall.payToAddress);
	const requiredAmount = BigInt(paywall.payment.maxAmountRequired);

	const matchingLog = logs.find(
		(log: any) =>
			getAddress(log.args.to) === payTo && log.args.value >= requiredAmount,
	);

	if (!matchingLog) {
		throw new PaymentVerificationError(
			"INSUFFICIENT_PAYMENT",
			"No matching transfer found in transaction logs",
		);
	}

	usedTxHashes.add(normalizedHash);
}

export async function verifyOffChainPayment(
	encoded: string,
	paywall: Config["paywall"],
): Promise<void> {
	const raw = decodePaymentHeader(encoded);
	const payment = parsePaymentPayload(raw);

	const nowSeconds = Math.floor(Date.now() / 1000);
	const { authorization, signature } = payment.payload;

	if (BigInt(authorization.validBefore) <= BigInt(nowSeconds)) {
		throw new PaymentVerificationError(
			"EXPIRED",
			"Payment authorization has expired",
		);
	}

	if (BigInt(authorization.validAfter) > BigInt(nowSeconds)) {
		throw new PaymentVerificationError(
			"NOT_YET_VALID",
			"Payment authorization is not yet valid",
		);
	}

	const payTo = getAddress(paywall.payToAddress);
	if (getAddress(authorization.to) !== payTo) {
		throw new PaymentVerificationError(
			"WRONG_RECIPIENT",
			"Payment is not addressed to this server",
		);
	}

	if (BigInt(authorization.value) < BigInt(paywall.payment.maxAmountRequired)) {
		throw new PaymentVerificationError(
			"INSUFFICIENT_AMOUNT",
			"Payment amount is less than required",
		);
	}

	const nonceKey = `${authorization.from.toLowerCase()}:${authorization.nonce.toLowerCase()}`;
	if (usedNonces.has(nonceKey)) {
		throw new PaymentVerificationError("REPLAY", "Payment nonce already used");
	}

	const chainId = NETWORK_CHAIN_ID[payment.network];
	const domain = {
		name: paywall.payment.extra.name || "USD Coin",
		version: paywall.payment.extra.version || "2",
		chainId,
		verifyingContract: getAddress(paywall.payment.asset),
	};

	const message = {
		from: getAddress(authorization.from),
		to: getAddress(authorization.to),
		value: BigInt(authorization.value),
		validAfter: BigInt(authorization.validAfter),
		validBefore: BigInt(authorization.validBefore),
		nonce: authorization.nonce,
	};

	const valid = await verifyTypedData({
		address: getAddress(authorization.from),
		domain,
		types: TRANSFER_WITH_AUTHORIZATION_TYPES,
		primaryType: "TransferWithAuthorization",
		message,
		signature,
	});

	if (!valid) {
		throw new PaymentVerificationError(
			"INVALID_SIGNATURE",
			"Payment signature is invalid",
		);
	}

	usedNonces.add(nonceKey);
}

// ---- x402 Facilitator (Approach A) ----
// See https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator
// Request: { x402Version, paymentPayload, paymentRequirements }
// Verify response: { isValid, payer?, invalidReason?, invalidMessage? }
// Settle response: { success, transaction?, network?, payer?, errorReason?, errorMessage? }
// Use CAIP-2 network IDs for Coinbase CDP: eip155:84532 (Base Sepolia), eip155:8453 (Base mainnet).

export type FacilitatorAuth = { keyId: string; keySecret: string };

function isCdpFacilitator(baseUrl: string): boolean {
	try {
		const url = new URL(baseUrl);
		return url.hostname === "cdp.coinbase.com" || url.hostname.endsWith(".cdp.coinbase.com");
	} catch {
		// If the URL cannot be parsed, it is not a valid CDP facilitator URL.
		return false;
	}
}

function buildFacilitatorRequirements(
	paywall: Config["paywall"],
	networkForFacilitator: string,
) {
	const maxAmount = paywall.payment.maxAmountRequired;
	return {
		scheme: "exact" as const,
		network: networkForFacilitator,
		maxAmountRequired: maxAmount,
		amount: maxAmount,
		resource: paywall.payment.resource,
		description: paywall.payment.description,
		mimeType: paywall.payment.mimeType,
		payTo: getAddress(paywall.payToAddress),
		asset: getAddress(paywall.payment.asset),
		maxTimeoutSeconds: paywall.payment.maxTimeoutSeconds ?? 300,
		...(paywall.payment.extra && Object.keys(paywall.payment.extra).length > 0
			? { extra: paywall.payment.extra }
			: {}),
	};
}

export async function verifyWithFacilitator(
	baseUrl: string,
	paymentPayload: PaymentPayload,
	paywall: Config["paywall"],
	auth?: FacilitatorAuth,
): Promise<{ isValid: boolean; payer?: string }> {
	const url = baseUrl.endsWith("/") ? `${baseUrl}verify` : `${baseUrl}/verify`;
	const networkForFacilitator = toCaip2Network(paymentPayload.network);
	const requirements = buildFacilitatorRequirements(
		paywall,
		networkForFacilitator,
	);
	const { payload } = paymentPayload;
	const payloadForFacilitator = {
		...paymentPayload,
		network: networkForFacilitator,
		accepted: requirements,
		payload: {
			...payload,
			authorization: {
				...payload.authorization,
				amount: payload.authorization.value,
			},
		},
	};

	const body = {
		x402Version: 2,
		paymentPayload: payloadForFacilitator,
		paymentRequirements: requirements,
		requirements,
	};
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json",
	};
	if (isCdpFacilitator(baseUrl) && auth?.keyId && auth?.keySecret) {
		const parsed = new URL(url);
		headers["Authorization"] = `Bearer ${await getCdpJwt({
			requestMethod: "POST",
			requestHost: parsed.hostname,
			requestPath: parsed.pathname,
			keyId: auth.keyId,
			keySecret: auth.keySecret,
		})}`;
	}

	const res = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
	const rawText = await res.text();
	let data: {
		isValid?: boolean;
		payer?: string;
		invalidReason?: string;
		invalidMessage?: string;
	};
	try {
		data = JSON.parse(rawText)
	} catch {
		throw new FacilitatorError(
			"FACILITATOR_VERIFY_FAILED",
			`Non-JSON response: ${rawText.slice(0, 200)}`,
		);
	}
	if (!res.ok) {
		throw new FacilitatorError(
			"FACILITATOR_VERIFY_FAILED",
			data.invalidMessage ??
			data.invalidReason ??
			`Verify failed: ${res.status}`,
		);
	}
	if (data.isValid) {
		const nonceKey = `${paymentPayload.payload.authorization.from.toLowerCase()}:${paymentPayload.payload.authorization.nonce.toLowerCase()}`;
		usedNonces.add(nonceKey);
	}
	return {
		isValid: data.isValid === true,
		payer: data.payer,
	};
}

export async function settleWithFacilitator(
	baseUrl: string,
	paymentPayload: PaymentPayload,
	paywall: Config["paywall"],
	auth?: FacilitatorAuth,
): Promise<{ success: boolean; transaction?: string; network?: string }> {
	const url = baseUrl.endsWith("/") ? `${baseUrl}settle` : `${baseUrl}/settle`;
	const networkForFacilitator = toCaip2Network(paymentPayload.network);
	const requirements = buildFacilitatorRequirements(
		paywall,
		networkForFacilitator,
	);
	const { payload } = paymentPayload;
	const payloadForFacilitator = {
		...paymentPayload,
		network: networkForFacilitator,
		accepted: requirements,
		payload: {
			...payload,
			authorization: {
				...payload.authorization,
				amount: payload.authorization.value,
			},
		},
	};
	const body = {
		x402Version: 2,
		paymentPayload: payloadForFacilitator,
		paymentRequirements: requirements,
		requirements,
	};
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json",
	};
	if (isCdpFacilitator(baseUrl) && auth?.keyId && auth?.keySecret) {
		const parsed = new URL(url);
		headers["Authorization"] = `Bearer ${await getCdpJwt({
			requestMethod: "POST",
			requestHost: parsed.hostname,
			requestPath: parsed.pathname,
			keyId: auth.keyId,
			keySecret: auth.keySecret,
		})}`;
	}

	const res = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
	const rawText = await res.text();
	let data: {
		success?: boolean;
		transaction?: string;
		network?: string;
		errorReason?: string;
		errorMessage?: string;
	};
	try {
		data = JSON.parse(rawText)
	} catch {
		throw new FacilitatorError(
			"FACILITATOR_SETTLE_FAILED",
			`Non-JSON response: ${rawText.slice(0, 200)}`,
		);
	}
	if (!res.ok) {
		throw new FacilitatorError(
			"FACILITATOR_SETTLE_FAILED",
			data.errorMessage ?? data.errorReason ?? `Settle failed: ${res.status}`,
		);
	}
	if (!data.success) {
		throw new FacilitatorError(
			"FACILITATOR_SETTLE_REJECTED",
			data.errorMessage ?? data.errorReason ?? "Settlement rejected",
		);
	}
	return {
		success: true,
		transaction: data.transaction,
		network: data.network,
	};
}

// ---- Backend wallet payment creation (Option B) ----

/** Fetch current block timestamp from chain (avoids server clock drift). */
async function getBlockTimestamp(rpcUrl: string): Promise<number> {
	const client = createPublicClient({ transport: http(rpcUrl) });
	const block = await client.getBlock({ blockTag: "latest" });
	return Number(block.timestamp);
}

export async function createBackendWalletPayment(
	account: EvmAccount,
	requirements: PaymentRequirements,
	rpcUrl?: string,
): Promise<string> {
	const nowSeconds = rpcUrl
		? await getBlockTimestamp(rpcUrl)
		: Math.floor(Date.now() / 1000);
	const validAfter = BigInt(nowSeconds - 600);
	const validBefore = BigInt(
		nowSeconds + (requirements.maxTimeoutSeconds ?? 300),
	);
	const nonce = generateNonce();

	const chainId = NETWORK_CHAIN_ID[requirements.network];
	const domain = {
		name: requirements.extra?.name ?? "USD Coin",
		version: requirements.extra?.version ?? "2",
		chainId,
		verifyingContract: getAddress(requirements.asset),
	};

	const message = {
		from: account.address,
		to: getAddress(requirements.payTo),
		value: BigInt(requirements.maxAmountRequired),
		validAfter,
		validBefore,
		nonce,
	};

	const signature = await account.signTypedData({
		domain,
		types: TRANSFER_WITH_AUTHORIZATION_TYPES,
		primaryType: "TransferWithAuthorization",
		message,
	});

	const payload: PaymentPayload = {
		x402Version: requirements.x402Version,
		scheme: "exact",
		network: requirements.network,
		payload: {
			signature,
			authorization: {
				from: account.address,
				to: getAddress(requirements.payTo),
				value: requirements.maxAmountRequired,
				validAfter: validAfter.toString(),
				validBefore: validBefore.toString(),
				nonce,
			},
		},
	};

	const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString(
		"base64",
	);
	return encoded;
}

// ---- Gas sponsorship (Openfort fee sponsorship) ----
// USDC transferWithAuthorization contract ABI (EIP-3009; payer submits)
const TRANSFER_WITH_AUTHORIZATION_ABI = [
	{
		name: "transferWithAuthorization",
		type: "function",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "from", type: "address" },
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
			{ name: "validAfter", type: "uint256" },
			{ name: "validBefore", type: "uint256" },
			{ name: "nonce", type: "bytes32" },
			{ name: "v", type: "uint8" },
			{ name: "r", type: "bytes32" },
			{ name: "s", type: "bytes32" },
		],
	},
] as const;

function splitSignature(signature: Hex): { v: number; r: Hex; s: Hex } {
	const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
	if (hex.length !== 130) {
		throw new PaymentVerificationError(
			"MALFORMED_PAYLOAD",
			`Invalid signature length (expected 65 bytes, got ${hex.length / 2})`,
		);
	}
	const r = `0x${hex.slice(0, 64)}` as Hex;
	const s = `0x${hex.slice(64, 128)}` as Hex;
	let v = Number.parseInt(hex.slice(128, 130), 16);
	if (v < 27) v += 27;
	return { v, r, s };
}

/**
 * Submits transferWithAuthorization from the backend wallet with Openfort gas sponsorship.
 * `accounts.evm.backend.sendTransaction` registers the EIP-7702 Delegated Account on first use,
 * signs the authorization while the EOA is not yet delegated on-chain, then creates and signs the
 * transaction intent. See https://www.openfort.io/docs/products/server/evm/gasless-transactions.
 * When feeSponsorshipId is empty, no policy is sent and Openfort uses project-scoped fee sponsorship.
 * When feeSponsorshipId is set, it is sent for transaction-scoped fee sponsorship.
 */
export async function submitTransferWithAuthorizationGasless(
	openfortClient: Openfort,
	walletId: string,
	feeSponsorshipId: string,
	payload: PaymentPayload,
	asset: Address,
	rpcUrl: string,
): Promise<Hex> {
	const chainId = NETWORK_CHAIN_ID[payload.network];
	const { authorization, signature } = payload.payload;
	const { v, r, s } = splitSignature(signature);

	const data = encodeFunctionData({
		abi: TRANSFER_WITH_AUTHORIZATION_ABI,
		functionName: "transferWithAuthorization",
		args: [
			getAddress(authorization.from),
			getAddress(authorization.to),
			BigInt(authorization.value),
			BigInt(authorization.validAfter),
			BigInt(authorization.validBefore),
			authorization.nonce,
			v,
			r,
			s,
		],
	});

	const account = await openfortClient.accounts.evm.backend.get({ id: walletId });
	const policy = feeSponsorshipId.trim();
	let intent: Awaited<
		ReturnType<typeof openfortClient.accounts.evm.backend.sendTransaction>
	>;
	try {
		intent = await openfortClient.accounts.evm.backend.sendTransaction({
			account,
			chainId,
			rpcUrl,
			interactions: [{ to: asset, data }],
			...(policy ? { policy } : {}),
		});
	} catch (err) {
		const msg = openfortErrorMessage(err);
		const invalidPol = msg.includes("Invalid pol") || msg.includes("Invalid policy");
		throw new PaymentVerificationError(
			"TX_BROADCAST_FAILED",
			invalidPol
				? `${msg} Use a fee sponsorship from the Fee sponsorships tab (not a backend wallet policy). For project-scoped gas sponsorship, leave OPENFORT_FEE_SPONSORSHIP_ID empty.`
				: msg,
		);
	}

	// sendTransaction resolves once the transaction exists, not once it has landed.
	// The receipt (and its hash) is set when the status turns terminal.
	for (let attempt = 0; attempt < 30; attempt++) {
		const tx = await openfortClient.transactions.get(intent.id);
		if (tx.status === "succeeded" && tx.receipt?.transactionHash)
			return tx.receipt.transactionHash as Hex;
		if (tx.status === "reverted" || tx.status === "failed") {
			throw new PaymentVerificationError(
				"TX_BROADCAST_FAILED",
				`Openfort transaction ${intent.id} ${tx.status}: ${tx.receipt?.error?.reason ?? "no reason given"}`,
			);
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	throw new PaymentVerificationError(
		"TX_BROADCAST_FAILED",
		`Openfort transaction ${intent.id} did not land after 30s. Check fee sponsorship (${policy ? `fee sponsorship ${policy}` : "project-scoped fee sponsorship"}) and the transaction status in the Openfort dashboard.`,
	);
}

export function toErrorJson(err: unknown): object {
	if (err instanceof PaymentVerificationError)
		return { name: err.name, code: err.code, message: err.message };
	if (err instanceof Error)
		return { name: err.name, message: err.message, stack: err.stack };
	return { value: String(err) };
}

// ---- Helpers ----

/** Extract a readable message from Openfort API errors (errorMessage.message) or standard Error. */
function openfortErrorMessage(err: unknown): string {
	if (err !== null && typeof err === "object") {
		const o = err as { errorMessage?: unknown };
		const em = o.errorMessage;
		if (
			em !== null &&
			typeof em === "object" &&
			typeof (em as { message: string }).message === "string"
		) {
			return (em as { message: string }).message;
		}
		if (typeof em === "string") return em;
	}
	if (err instanceof Error && err.message && err.message !== "[object Object]")
		return err.message;
	return "Openfort transaction intent failed";
}

function generateNonce(): Hex {
	return `0x${randomBytes(32).toString("hex")}` as Hex;
}

export function parsePaymentPayload(raw: unknown): PaymentPayload {
	if (typeof raw !== "object" || raw === null) {
		throw new PaymentVerificationError(
			"MALFORMED_PAYLOAD",
			"Payment payload must be an object",
		);
	}

	const obj = raw as Record<string, unknown>;

	if (obj.x402Version !== 2) {
		throw new PaymentVerificationError(
			"MALFORMED_PAYLOAD",
			"Unsupported x402 version (only v2 supported)",
		);
	}

	if (obj.scheme !== "exact") {
		throw new PaymentVerificationError(
			"MALFORMED_PAYLOAD",
			"Unsupported payment scheme",
		);
	}

	const network = obj.network;
	if (network !== "base-sepolia" && network !== "base") {
		throw new PaymentVerificationError(
			"MALFORMED_PAYLOAD",
			"Unsupported network",
		);
	}

	const payload = obj.payload;
	if (typeof payload !== "object" || payload === null) {
		throw new PaymentVerificationError(
			"MALFORMED_PAYLOAD",
			"Missing payload object",
		);
	}

	const p = payload as { authorization: unknown; signature: unknown };
	const authorization = p.authorization;
	if (typeof authorization !== "object" || authorization === null) {
		throw new PaymentVerificationError(
			"MALFORMED_PAYLOAD",
			"Missing authorization object",
		);
	}

	const auth = authorization as { [key: string]: unknown };
	const authFields = [
		"from",
		"to",
		"value",
		"validAfter",
		"validBefore",
		"nonce",
	] as const;
	for (const field of authFields) {
		if (typeof auth[field] !== "string") {
			throw new PaymentVerificationError(
				"MALFORMED_PAYLOAD",
				`Missing or invalid authorization.${field}`,
			);
		}
	}

	if (typeof p.signature !== "string") {
		throw new PaymentVerificationError(
			"MALFORMED_PAYLOAD",
			"Missing signature",
		);
	}

	return {
		x402Version: 2,
		scheme: "exact",
		network: network as SupportedNetwork,
		payload: {
			signature: p.signature as Hex,
			authorization: {
				from: auth.from as Address,
				to: auth.to as Address,
				value: auth.value as string,
				validAfter: auth.validAfter as string,
				validBefore: auth.validBefore as string,
				nonce: auth.nonce as Hex,
			},
		},
	};
}

export function decodePaymentHeader(paymentHeader: string): unknown {
	if (!paymentHeader) {
		throw new PaymentVerificationError(
			"MALFORMED_PAYLOAD",
			"Missing payment header",
		);
	}
	try {
		const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
		return JSON.parse(decoded);
	} catch {
		throw new PaymentVerificationError(
			"MALFORMED_PAYLOAD",
			"Failed to decode payment header",
		);
	}
}

export function createPaymentRequiredResponse(
	paywallConfig: Config["paywall"],
) {
	return {
		error: "Payment required",
		x402Version: paywallConfig.payment.x402Version,
		paymentRequirements: {
			...paywallConfig.payment,
			payTo: paywallConfig.payToAddress,
		},
	};
}
