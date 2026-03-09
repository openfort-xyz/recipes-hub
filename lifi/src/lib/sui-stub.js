// Stub for @mysten/sui/jsonRpc — the app does not use Sui.
// @mysten/dapp-kit@1.0.3 (pulled in by @lifi/wallet-management) imports
// these symbols which were removed in @mysten/sui ≥1.x.
export function getJsonRpcFullnodeUrl() { return ''; }
export function isSuiJsonRpcClient() { return false; }
export class SuiJsonRpcClient {}
