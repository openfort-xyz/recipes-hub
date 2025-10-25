import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { GraphQLClient, gql } from 'graphql-request';

const MORPHO_API = "https://api.morpho.org/graphql";
const VAULT_ADDRESS = "0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183";

interface VaultApyResponse {
  vaultByAddress?: {
    state?: {
      netApy?: number | string;
    };
  };
}

const GET_VAULT_APY = gql`
  query VaultApy($vaultAddress: String!, $chainId: Int!) {
    vaultByAddress(address: $vaultAddress, chainId: $chainId) {
      state { netApy }
    }
  }
`;

export function useVaultApy() {
  const [vaultApy, setVaultApy] = useState<string>("0.00");
  const { address, chainId } = useAccount();

  useEffect(() => {
    const fetchVaultApy = async () => {
      if (!chainId) return;

      try {
        const client = new GraphQLClient(MORPHO_API);
        const data = await client.request<VaultApyResponse>(GET_VAULT_APY, {
          vaultAddress: VAULT_ADDRESS,
          chainId: chainId,
        });

        const netApy = data?.vaultByAddress?.state?.netApy;
        if (netApy) {
          setVaultApy((Number(netApy) * 100).toFixed(2));
        }
      } catch (err) {
        console.error("Error fetching vault APY:", err);
      }
    };

    fetchVaultApy();
  }, [address, chainId]);

  return vaultApy;
}
