import { useQueries, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { useMemo } from 'react';
import {
  ComputedReserveDataWithMarket,
  useAppDataContext,
} from 'src/hooks/app-data-provider/useAppDataProvider';
import { parseActivity } from 'src/modules/vault-detail/utils/parseActivity';
import { vaultsConfig } from 'src/modules/vault-detail/VaultManagement/facets/vaultsConfig';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { ChainIds } from 'src/utils/const';
import { useWalletClient } from 'wagmi';

import { useVault, VaultData } from './useVault';
// Constants
const POLLING_INTERVAL = 30000; // 30 seconds

// Query key factory for caching
export const vaultQueryKeys = {
  vaultAssetBalance: (vaultId: string, assetAddress: string, chainId?: number) => [
    'vaultAssetBalance',
    vaultId,
    assetAddress,
    chainId,
  ],
  vaultAssetAllowance: (
    vaultId: string,
    assetAddress: string,
    ownerAddress: string,
    chainId?: number
  ) => ['vaultAssetAllowance', vaultId, assetAddress, ownerAddress, chainId],
  vaultAssetDetails: (assetAddress: string, chainId?: number) => [
    'vaultAssetDetails',
    assetAddress,
    chainId,
  ],
  allVaultAssets: (vaultId: string, chainId?: number) => ['allVaultAssets', vaultId, chainId],
  allVaults: (chainId?: number) => ['allVaults', chainId],
  vaultInList: (vaultId: string, chainId?: number) => ['allVaults', chainId, vaultId],
  allDeployedVaults: (chainId?: number) => ['allDeployedVaults', chainId],
  userVaultData: (vaultId: string, userAddress: string, chainId?: number) => [
    'userVaultData',
    vaultId,
    userAddress,
    chainId,
  ],
};

// General hook options type
export interface VaultDataHookOpts<TData, TResult = TData>
  extends Omit<UseQueryOptions<TData, Error, TResult>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

// Common hook to get provider
export const useVaultProvider = (chainIdParam?: number) => {
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    // Get chainId from wallet or use provided parameter
    const chainId = walletClient?.chain.id || chainIdParam || ChainIds.flowEVMMainnet;

    // If wallet is connected, use it as provider
    if (walletClient) {
      return new ethers.providers.Web3Provider(walletClient as ethers.providers.ExternalProvider);
    }

    // If no wallet is connected, create a fallback provider using the network's RPC URL
    const networkConfig = networkConfigs[chainId];
    if (networkConfig) {
      // Use private RPC URL if available, otherwise use the first public RPC URL
      const rpcUrl = networkConfig.privateJsonRPCUrl || networkConfig.publicJsonRPCUrl[0];
      if (rpcUrl) {
        return new ethers.providers.JsonRpcProvider(rpcUrl);
      }
    }

    // If we can't determine the chain or find an RPC URL, default to Flow Mainnet
    return new ethers.providers.JsonRpcProvider(
      networkConfigs[ChainIds.flowEVMMainnet].publicJsonRPCUrl[0]
    );
  }, [walletClient, chainIdParam]);
};

// Base hook for creating vault queries
const useVaultQuery = <TData, TResult = TData>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  isEnabled: boolean,
  opts?: VaultDataHookOpts<TData, TResult>
) => {
  return useQuery({
    queryKey,
    queryFn,
    refetchInterval: POLLING_INTERVAL,
    enabled: isEnabled && opts?.enabled !== false,
    ...opts,
  });
};

// Hook for getting multiple vault asset balances
export const useVaultAssetsBalances = <TResult = Array<{ assetAddress: string; balance: string }>>(
  vaultId: string,
  assetAddresses: string[],
  opts?: VaultDataHookOpts<{ assetAddress: string; balance: string }, TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);

  return useQueries({
    queries: assetAddresses.map((assetAddress) => ({
      queryKey: vaultQueryKeys.vaultAssetBalance(vaultId, assetAddress, chainId),
      queryFn: async () => {
        if (!provider) {
          throw new Error('Provider not available');
        }

        const tokenContract = new ethers.Contract(
          assetAddress,
          [`function balanceOf(address) external view returns (uint256)`],
          provider
        );

        const balance = await tokenContract.balanceOf(vaultId);
        return { assetAddress, balance: balance.toString() };
      },
      refetchInterval: POLLING_INTERVAL,
      enabled: !!provider && !!vaultId && !!assetAddress && opts?.enabled !== false,
      ...opts,
    })),
  });
};

// Hook for checking token allowance
export const useVaultAssetAllowance = (
  vaultId: string,
  assetAddress: string,
  ownerAddress: string,
  opts?: VaultDataHookOpts<string>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);

  return useVaultQuery(
    vaultQueryKeys.vaultAssetAllowance(vaultId, assetAddress, ownerAddress, chainId),
    async () => {
      if (!provider || !vaultId || !assetAddress || !ownerAddress) {
        throw new Error('Missing required parameters');
      }

      const tokenContract = new ethers.Contract(
        assetAddress,
        [`function allowance(address owner, address spender) external view returns (uint256)`],
        provider
      );

      const allowance = await tokenContract.allowance(ownerAddress, vaultId);
      return allowance.toString();
    },
    !!provider && !!vaultId && !!assetAddress && !!ownerAddress,
    opts
  );
};

// Hook to fetch asset details (symbol, name, decimals)
export interface AssetDetails {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

// Hook for getting multiple assets details
export const useVaultAssetsDetails = <TResult = Array<AssetDetails>>(
  assetAddresses: string[],
  opts?: VaultDataHookOpts<AssetDetails, TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);

  return useQueries({
    queries: assetAddresses.map((assetAddress) => ({
      queryKey: vaultQueryKeys.vaultAssetDetails(assetAddress, chainId),
      queryFn: async () => {
        if (!provider || !assetAddress) {
          throw new Error('Missing required parameters');
        }

        const tokenContract = new ethers.Contract(
          assetAddress,
          [
            `function symbol() external view returns (string)`,
            `function name() external view returns (string)`,
            `function decimals() external view returns (uint8)`,
          ],
          provider
        );

        const [symbol, name, decimals] = await Promise.all([
          tokenContract.symbol(),
          tokenContract.name(),
          tokenContract.decimals(),
        ]);

        return {
          address: assetAddress,
          symbol,
          name,
          decimals,
        };
      },
      refetchInterval: POLLING_INTERVAL,
      enabled: !!provider && !!assetAddress && opts?.enabled !== false,
      ...opts,
    })),
  });
};

const fetchAllocation = async (
  vaultId: string,
  chainId: number,
  reserves: ComputedReserveDataWithMarket[]
): Promise<VaultData['allocation']> => {
  const networkConfig = networkConfigs[chainId];
  const baseUrl = networkConfig.explorerLink;

  try {
    const response = await fetch(
      `${baseUrl}/api/v2/addresses/${vaultId}/tokens?type=ERC-20%2CERC-721%2CERC-1155`,
      {
        headers: {
          accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch allocations: ${response.statusText}`);
    }

    const data: {
      items: Array<{
        token: {
          address: string;
          circulating_market_cap: string | null;
          decimals: string;
          exchange_rate: string | null;
          holders: string;
          icon_url: string | null;
          name: string;
          symbol: string;
          total_supply: string;
          type: string;
          volume_24h: string | null;
        };
        token_id: string | null;
        token_instance: string | null;
        value: string;
      }>;
      next_page_params: string | null;
    } = await response.json();

    const processedData = data.items.map((item) => {
      const reserve = reserves.find(
        (reserve) =>
          reserve.symbol === item.token.symbol ||
          reserve.aTokenAddress === item.token.address ||
          reserve.variableDebtTokenAddress === item.token.address
      );
      const price = Number(reserve?.formattedPriceInMarketReferenceCurrency || 0);
      const value = Number(formatUnits(item.value, item.token.decimals)) * price;

      return {
        assetName: item.token.name,
        assetSymbol: item.token.symbol,
        assetAddress: item.token.address,
        type: item.token.type,
        market: 'Flow', // Default market since we're on Flow network
        balance: Number(formatUnits(item.value, item.token.decimals)),
        price,
        value,
      };
    });

    return processedData;
  } catch (error) {
    console.error('Error fetching allocations:', error);
    throw error;
  }
};

const fetchActivity = async (
  vaultId: string,
  chainId: number,
  reserves: ComputedReserveDataWithMarket[]
): Promise<VaultData['activity']> => {
  const networkConfig = networkConfigs[chainId];
  const baseUrl = networkConfig.explorerLink;

  try {
    const response = await fetch(`${baseUrl}/api/v2/addresses/${vaultId}/transactions`, {
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity: ${response.statusText}`);
    }

    const data: {
      items: Array<{
        hash: string;
        timestamp: string;
        method: string;
        from: {
          hash: string;
          name: string | null;
        };
        to: {
          hash: string;
          name: string | null;
        };
        decoded_input: {
          method_call: string;
          parameters: Array<{
            name: string;
            type: string;
            value: string;
          }>;
        };
        status: string;
        result: string;
        exchange_rate: string;
      }>;
      next_page_params: string | null;
    } = await response.json();

    const items = data.items;
    const processedData = items
      .filter((activity) => activity.status !== 'error')
      .map((activity) => {
        const parsedActivity = parseActivity(activity);

        // If we have parsed actions, use the first asset from the parsed action
        if (parsedActivity.parsedAction?.assets) {
          const assets = parsedActivity.parsedAction.assets;
          const assetsReserves = assets.map((asset) => {
            const reserve = reserves.find((reserve) => reserve.underlyingAsset.toLowerCase() === asset.address?.toLowerCase());
            return {
              ...asset,
              reserve,
            };
          });

          return {
            ...parsedActivity,
            type: `Bundled ${parsedActivity.parsedAction.action}`,
            assetSymbol: assetsReserves.map((asset) => asset.reserve?.symbol).join(' / '),
            assetName: assetsReserves.map((asset) => asset.reserve?.name).join(' / '),
            amount: assetsReserves[0]
              ? formatUnits(assetsReserves[0]?.amount, assetsReserves[0]?.reserve?.decimals)
              : '0',
            price: assetsReserves[0]?.reserve ? Number(assetsReserves[0].reserve.priceInUSD) : 0,
          };
        }

        // Fallback to original behavior for non-parsed actions
        const reserve = reserves.find((reserve) => reserve.id === parsedActivity.assetAddress);
        return {
          ...parsedActivity,
          price: reserve ? Number(reserve.priceInUSD) : 0,
        };
      });

    return processedData;
  } catch (error) {
    console.error('Error fetching activity:', error);
    throw error;
  }
};

export const useVaultsListData = <TResult = VaultData>(
  vaultIds: string[],
  opts?: VaultDataHookOpts<VaultData, TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);
  const { reserves } = useAppDataContext();

  const individualQueryResults = useQueries({
    queries: vaultIds.map((vaultId) => ({
      queryKey: vaultQueryKeys.vaultInList(vaultId, chainId),
      queryFn: async () => {
        if (!provider || !vaultId) {
          throw new Error('Missing required parameters');
        }

        const vaultDiamondContract = new ethers.Contract(
          vaultId,
          [
            `function totalAssets() external view override returns (uint256)`,
            `function asset() external view override returns (address)`,
            `function decimals() external view returns (uint8)`,
            `function name() external view override returns (string)`,
            `function convertToAssets(uint256 shares) external view returns (uint256 assets)`,
          ],
          provider
        );
        const [totalAssets, assetAddress, decimals, name] = await Promise.all([
          vaultDiamondContract.totalAssets().catch(() => 0),
          vaultDiamondContract.asset().catch(() => undefined),
          vaultDiamondContract.decimals().catch(() => 18),
          vaultDiamondContract.name().catch(() => 'Unnamed Vault'),
        ]);
        const sharePriceInAsset = await vaultDiamondContract.convertToAssets(
          parseUnits('1', decimals)
        );

        const reserve = reserves.find((reserve) => reserve.underlyingAsset.toLowerCase() === assetAddress?.toLowerCase());
        const vaultData: VaultData = {
          id: vaultId,
          overview: {
            name,
            shareCurrencySymbol: reserve?.symbol,
            assetDecimals: decimals,
            sharePrice: Number(formatUnits(sharePriceInAsset, decimals)),
            assetAddress: assetAddress,
          },
          financials: {
            liquidity: {
              totalAssets: totalAssets.toString(),
            },
          },
        };
        return vaultData as unknown as TResult;
      },
      refetchInterval: POLLING_INTERVAL,
      enabled: !!provider && !!vaultId && opts?.enabled !== false,
      ...opts,
    })),
  });

  const isLoading = individualQueryResults.some(query => query.isLoading);
  const isError = individualQueryResults.some(query => query.isError);
  const allSucceeded = individualQueryResults.every(query => query.isSuccess);

  let data: TResult[] | undefined = undefined;
  if (allSucceeded && !isLoading) {
    data = individualQueryResults
      .map(query => query.data)
      .filter(Boolean) as TResult[];
  }

  return {
    data,
    isLoading,
    isError,
    isSuccess: allSucceeded && !isLoading,
  };
};

export const useUserVaultsData = <TResult = { maxWithdraw: ethers.BigNumber; decimals: number }>(
  userAddress: string,
  vaultIds: string[],
  opts?: VaultDataHookOpts<{ maxWithdraw: ethers.BigNumber; decimals: number }, TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);

  return useQueries({
    queries: vaultIds.map((vaultId) => ({
      queryKey: vaultQueryKeys.userVaultData(vaultId, userAddress, chainId),
      queryFn: async () => {
        if (!provider || !vaultId) {
          throw new Error('Missing required parameters');
        }

        const vaultDiamondContract = new ethers.Contract(
          vaultId,
          [
            `function maxWithdraw(address user) external view override returns (uint256)`,
            `function decimals() external view returns (uint8)`,
          ],
          provider
        );
        const [maxWithdraw, decimals] = await Promise.all([
          vaultDiamondContract.maxWithdraw(userAddress).catch(() => 0),
          vaultDiamondContract.decimals().catch(() => 18),
        ]);

        return {
          maxWithdraw,
          decimals,
        };
      },
      enabled: !!provider && !!vaultId && !!userAddress,
      ...opts,
    })),
  });
};

export const useVaultData = <TResult = VaultData>(
  vaultId: string,
  opts?: VaultDataHookOpts<VaultData, TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);
  const { reserves } = useAppDataContext();

  return useVaultQuery<VaultData, TResult>(
    vaultQueryKeys.allVaults(chainId),
    async () => {
      if (!provider || !vaultId) {
        throw new Error('Missing required parameters');
      }

      const vaultDiamondContract = new ethers.Contract(
        vaultId,
        [
          `function totalAssets() external view override returns (uint256)`,
          `function asset() external view override returns (address)`,
          `function name() external view override returns (string)`,
          `function decimals() external view returns (uint8)`,
          `function guardian() external view returns (address)`,
          `function curator() external view returns (address)`,
          `function maxDeposit(address receiver) external view returns (uint256 maxAssets)`,
          `function convertToAssets(uint256 shares) external view returns (uint256 assets)`,
        ],
        provider
      );
      const [
        totalAssets,
        assetAddress,
        name,
        decimals,
        guardian,
        curator,
        maxDeposit,
        allocation,
        activity,
      ] = await Promise.all([
        vaultDiamondContract.totalAssets().catch(() => 0),
        vaultDiamondContract.asset().catch(() => undefined),
        vaultDiamondContract.name().catch(() => 'Unnamed Vault'),
        vaultDiamondContract.decimals().catch(() => 18),
        vaultDiamondContract.guardian().catch(() => undefined),
        vaultDiamondContract.curator().catch(() => undefined),
        vaultDiamondContract
          .maxDeposit('0x0000000000000000000000000000000000000000')
          .catch(() => 0),
        fetchAllocation(vaultId, chainId, reserves),
        fetchActivity(vaultId, chainId, reserves),
      ]);

      const sharePriceInAsset = await vaultDiamondContract.convertToAssets(
        parseUnits('1', decimals)
      );

      const reserve = reserves.find((reserve) => reserve.underlyingAsset.toLowerCase() === assetAddress?.toLowerCase());

      return {
        id: vaultId,
        overview: {
          name,
          assetDecimals: decimals,
          assetAddress,
          shareCurrencySymbol: reserve?.symbol,
          sharePrice: Number(formatUnits(sharePriceInAsset, decimals)),
          roles: {
            guardian,
            curator,
          },
        },
        financials: {
          liquidity: {
            totalAssets,
            maxDeposit,
          },
        },
        allocation,
        activity,
      };
    },
    !!provider && !!vaultId,
    opts
  );
};

export const useDeployedVaults = <TResult = string[]>(
  opts?: VaultDataHookOpts<string[], TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);

  return useVaultQuery<string[], TResult>(
    vaultQueryKeys.allDeployedVaults(chainId),
    async () => {
      if (!provider) {
        throw new Error('Missing required parameters');
      }

      const vaultFactoryContract = new ethers.Contract(
        vaultsConfig[chainId].addresses.VAULT_FACTORY,
        [`function getDeployedVaults() external view returns (address[] memory)`],
        provider
      );

      const vaultIds = await vaultFactoryContract.getDeployedVaults();
      return vaultIds;
    },
    !!provider,
    opts
  );
};
