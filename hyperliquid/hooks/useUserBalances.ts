import { useEffect, useState, useCallback, useMemo } from "react";
import { ethers } from "ethers";

import { ARBITRUM_SEPOLIA_CHAIN } from "../constants/network";
import { HYPERLIQUID_USDC_TOKEN_ADDRESS } from "../constants/hyperliquid";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export const useWalletBalance = (walletAddress?: string) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const rpcUrl = useMemo(() => ARBITRUM_SEPOLIA_CHAIN.rpcUrls.default.http[0], []);
  const provider = useMemo(() => new ethers.JsonRpcProvider(rpcUrl), [rpcUrl]);
  const tokenContract = useMemo(
    () => new ethers.Contract(HYPERLIQUID_USDC_TOKEN_ADDRESS, ERC20_ABI, provider),
    [provider]
  );
  
  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const [rawBalance, decimals] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.decimals()
      ]);
      const formattedBalance = Number(ethers.formatUnits(rawBalance, decimals));
      setBalance(formattedBalance);
    } catch (e) {
      console.error(e);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [tokenContract, walletAddress]);

  useEffect(() => {
    if (!walletAddress) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount + refetch-on-address-change; this recipe's data layer is custom hooks, not a query library.
    fetchBalance();
  }, [walletAddress, fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
};
