import { useQuery } from '@tanstack/react-query';
import { getInboundRoutes, getUserBalancesForRoutes, type InboundRouteWithBalance } from '@oydual31/more-vaults-sdk/viem';

export function useInboundRoutes(
  hubChainId: number | undefined,
  vaultAddress: string | undefined,
  vaultAsset: string | undefined,
  userAddress: string | undefined
) {
  return useQuery<InboundRouteWithBalance[]>({
    queryKey: ['inboundRoutes', hubChainId, vaultAddress, vaultAsset, userAddress],
    queryFn: async () => {
      const routes = await getInboundRoutes(
        hubChainId!,
        vaultAddress as `0x${string}`,
        vaultAsset as `0x${string}`,
        userAddress as `0x${string}`
      );
      return getUserBalancesForRoutes(routes, userAddress as `0x${string}`);
    },
    enabled: !!hubChainId && !!vaultAddress && !!vaultAsset && !!userAddress,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Returns 6 for USDC-like tokens, 18 for everything else */
export function getRouteTokenDecimals(symbol: string): number {
  return symbol.toUpperCase().includes('USDC') ? 6 : 18;
}
