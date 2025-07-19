import { useQueries, useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
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

import { VAULT_ID_TO_CURATOR_LOGO, VAULT_ID_TO_NAME } from './constants';
import { useVault, VaultData } from './useVault';
import { fetchVaultData, fetchVaultHistoricalSnapshots, formatSnapshotsForChart } from './vaultSubgraph';
// Constants
const POLLING_INTERVAL = 30000; // 30 seconds

// Asset data interface for unified oracle/reserve usage
export interface AssetData {
  price: number;        // USD price 
  decimals: number;     // Asset decimals
  symbol: string;       // Asset symbol  
  name: string;         // Asset name
  address: string;      // Asset address
  source: 'oracle' | 'reserve';  // Data source for debugging
}

// Query key factory for caching
export const vaultQueryKeys = {
  vaultInList: (vaultId: string, chainId?: number) => ['allVaults', chainId, vaultId],
  allDeployedVaults: (chainId?: number) => ['allDeployedVaults', chainId],
  userVaultData: (vaultId: string, userAddress: string, chainId?: number) => [
    'userVaultData',
    vaultId,
    userAddress,
    chainId,
  ],
  vaultDetailsWithSubgraph: (vaultId: string, chainId?: number) => [
    'vaultDetails',
    chainId,
    vaultId,
    'subgraph',
  ],
  userGlobalData: (userAddress: string, chainId?: number) => ['userGlobalData', userAddress, chainId],
  incentives: (chainId?: number) => ['incentives', chainId],
  userRewards: (userAddress: string, chainId?: number) => ['userRewards', userAddress, chainId],
  assetData: (assetAddress: string, chainId?: number) => ['assetData', assetAddress, chainId],
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
    // If wallet is connected, use it as provider
    if (walletClient) {
      return new ethers.providers.Web3Provider(walletClient as ethers.providers.ExternalProvider);
    }

    // Get chainId from wallet or use provided parameter
    const chainId = chainIdParam || ChainIds.flowEVMMainnet;

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



interface RewardItem {
  merkle_root: string;
  reward_amount_wei: string;
  reward_token_address: string;
  merkle_proof: string[];
  reward_contract_address: string;
}

const fetchRewards = async ({ userAddress }: { userAddress: string }): Promise<RewardItem[]> => {
  try {
    if (!process.env.NEXT_PUBLIC_REWARD_URL) {
      console.warn("NEXT_PUBLIC_REWARD_URL is not defined, skipping rewards fetch");
      return [];
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_REWARD_URL}/api/vaults/user?userAddress=${userAddress}`);

    if (!response.ok) {
      throw new Error(`Error fetching rewards: ${response.statusText}`);
    }
    const data: RewardItem[] = await response.json();

    // Guard clause to handle undefined or empty data
    if (!data || !Array.isArray(data)) {
      console.warn('API response is not a valid array:', data);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch rewards:", error);
    return [];
  }
};

interface IncentiveItem {
  id: number;
  name: string;
  start_timestamp: number;
  end_timestamp: number;
  reward_token_address: string;
  total_reward_amount_wei: string;
  tracked_token_address: string;
  tracked_token_type: "supply" | "borrow" | "supply_and_borrow";
  created_at: number;
  reward_token_symbol: string;
  apy_bps: number;
}

// Helper function to encode/validate tracked token type
const encodeTrackedTokenType = (type: string): "supply" | "borrow" | "supply_and_borrow" => {
  const normalizedType = type.toLowerCase().trim();

  switch (normalizedType) {
    case 'supply':
      return 'supply';
    case 'borrow':
      return 'borrow';
    case 'supply_and_borrow':
    case 'supply and borrow':
    case 'supplyAndBorrow':
      return 'supply_and_borrow';
    default:
      console.warn(`Unknown tracked_token_type: ${type}, defaulting to 'supply'`);
      return 'supply';
  }
};

const fetchIncentives = async (): Promise<IncentiveItem[]> => {
  try {
    if (!process.env.NEXT_PUBLIC_REWARD_URL) {
      console.warn("NEXT_PUBLIC_REWARD_URL is not defined, skipping incentives fetch");
      return [];
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_REWARD_URL}/api/vaults/apy`);
    if (!response.ok) {
      throw new Error(`Error fetching incentives: ${response.statusText}`);
    }
    const rawData: (Omit<IncentiveItem, 'tracked_token_type'> & { tracked_token_type: string })[] = await response.json();

    // Guard clause to handle undefined or empty rawData
    if (!rawData || !Array.isArray(rawData)) {
      console.warn('API response is not a valid array:', rawData);
      return [];
    }

    // Encode/validate the tracked_token_type field for each incentive
    const data: IncentiveItem[] = rawData.map((incentive) => ({
      ...incentive,
      tracked_token_type: encodeTrackedTokenType(incentive.tracked_token_type),
    }));

    return data;
  } catch (error) {
    console.error("Failed to fetch incentives:", error);
    return [];
  }
};

// Separate hook for incentives that can be shared across vault queries
export const useIncentives = <TResult = IncentiveItem[]>(
  opts?: VaultDataHookOpts<IncentiveItem[], TResult>
) => {
  const { chainId } = useVault();

  return useVaultQuery<IncentiveItem[], TResult>(
    vaultQueryKeys.incentives(chainId),
    fetchIncentives,
    opts?.enabled !== false,
    {
      ...opts,
      // Cache incentives for longer since they don't change as frequently
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

// Separate hook for rewards that can be shared across vault queries
export const useRewards = <TResult = RewardItem[]>(
  userAddress: string,
  opts?: VaultDataHookOpts<RewardItem[], TResult>
) => {
  const { chainId } = useVault();

  return useVaultQuery<RewardItem[], TResult>(
    vaultQueryKeys.userRewards(userAddress, chainId),
    () => fetchRewards({ userAddress }),
    !!userAddress && opts?.enabled !== false,
    {
      ...opts,
      // Cache rewards for a shorter time since they're user-specific
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Hook for unified asset data (oracle + fallback to reserve) - handles multiple assets
export const useAssetsData = <TResult = AssetData[]>(
  assetAddresses: string[],
  opts?: VaultDataHookOpts<AssetData[], TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);
  const { reserves } = useAppDataContext();

  const baseQueryIsEnabled = !!provider && (opts?.enabled !== false);
  const reservesAreReady = reserves.length > 0;

  // Create safe asset addresses array for mapping
  const safeAssetAddresses = (!assetAddresses || !Array.isArray(assetAddresses)) ? [] : assetAddresses.filter(Boolean);

  const assetDataQueries = useQueries({
    queries: safeAssetAddresses.map(assetAddress => ({
      queryKey: vaultQueryKeys.assetData(assetAddress, chainId),
      queryFn: async (): Promise<AssetData> => {
        if (!provider || !assetAddress) {
          throw new Error('Missing required parameters for asset data');
        }

        // Get oracle address for this chain
        const oracleAddress = vaultsConfig[chainId]?.addresses?.ORACLE;

        let assetData: AssetData;

        try {
          // Try oracle + asset contract first (if oracle available)
          if (oracleAddress) {
            const [oracleContract, assetContract] = [
              new ethers.Contract(
                oracleAddress,
                [{ "inputs": [{ "internalType": "address", "name": "asset", "type": "address" }], "name": "getAssetPrice", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }],
                provider
              ),
              new ethers.Contract(
                assetAddress,
                [
                  'function decimals() external view returns (uint8)',
                  'function symbol() external view returns (string)',
                  'function name() external view returns (string)',
                ],
                provider
              )
            ];

            const [priceRaw, decimals, symbol, name] = await Promise.all([
              oracleContract.getAssetPrice(assetAddress),
              assetContract.decimals().catch(() => 18),
              assetContract.symbol().catch(() => 'UNKNOWN'),
              assetContract.name().catch(() => 'Unknown Token'),
            ]);

            // Oracle returns USD price with 8 decimals
            const price = Number(formatUnits(priceRaw, 8));

            assetData = {
              price,
              decimals,
              symbol,
              name,
              address: assetAddress,
              source: 'oracle',
            };
          } else {
            throw new Error('No oracle available, falling back to reserve');
          }
        } catch (error) {
          console.warn(`Oracle failed for asset ${assetAddress}, falling back to reserve:`, error);

          // Fallback to reserve data
          const reserve = reserves.find((r) => r.underlyingAsset.toLowerCase() === assetAddress.toLowerCase());
          if (!reserve) {
            console.warn(`No reserve data found for asset ${assetAddress}, using fallback values`);

            // Try to get basic token info from contract as last resort
            try {
              const assetContract = new ethers.Contract(
                assetAddress,
                [
                  'function decimals() external view returns (uint8)',
                  'function symbol() external view returns (string)',
                  'function name() external view returns (string)',
                ],
                provider
              );

              const [decimals, symbol, name] = await Promise.all([
                assetContract.decimals().catch(() => 18),
                assetContract.symbol().catch(() => 'UNKNOWN'),
                assetContract.name().catch(() => 'Unknown Token'),
              ]);

              assetData = {
                price: 0, // No price available
                decimals,
                symbol,
                name,
                address: assetAddress,
                source: 'reserve',
              };
            } catch (contractError) {
              console.warn(`Failed to fetch contract info for ${assetAddress}, using minimal fallback:`, contractError);

              // Absolute fallback - return minimal data to prevent query failure
              assetData = {
                price: 0,
                decimals: 18,
                symbol: 'UNKNOWN',
                name: 'Unknown Token',
                address: assetAddress,
                source: 'reserve',
              };
            }
          } else {
            assetData = {
              price: Number(reserve.formattedPriceInMarketReferenceCurrency || 0),
              decimals: reserve.decimals,
              symbol: reserve.symbol,
              name: reserve.name,
              address: assetAddress,
              source: 'reserve',
            };
          }
        }

        return assetData;
      },
      enabled: baseQueryIsEnabled && !!assetAddress && reservesAreReady,
      // Cache asset data for 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchInterval: POLLING_INTERVAL,
    }))
  });

  // Return structure similar to other vault hooks
  if (!safeAssetAddresses.length) {
    return {
      data: [] as TResult,
      isLoading: false,
      isError: false,
      isSuccess: true,
    };
  }

  if (baseQueryIsEnabled && !reservesAreReady) {
    return {
      data: undefined,
      isLoading: true,
      isError: false,
      isSuccess: false,
    };
  }

  const isLoading = assetDataQueries.some(query => query.isLoading);
  const isError = assetDataQueries.some(query => query.isError);
  const allSucceeded = assetDataQueries.every(query => query.isSuccess);

  let data: TResult | undefined = undefined;
  if (allSucceeded && !isLoading) {
    const assetDataArray = assetDataQueries
      .map(query => query.data)
      .filter(Boolean) as AssetData[];
    data = assetDataArray as TResult;
  }

  return {
    data,
    isLoading,
    isError,
    isSuccess: allSucceeded && !isLoading,
  };
};

// Convenience hook for single asset data (backward compatibility)
export const useAssetData = <TResult = AssetData>(
  assetAddress: string,
  opts?: VaultDataHookOpts<AssetData, TResult>
) => {
  const result = useAssetsData([assetAddress], {
    enabled: opts?.enabled,
  });

  return {
    ...result,
    data: result.data?.[0] as TResult | undefined,
  };
};

// Helper function to get incentives for a specific vault
const getVaultIncentives = (incentives: IncentiveItem[], vaultId: string): IncentiveItem[] => {
  return incentives
    .filter((incentive) => incentive.tracked_token_address.toLowerCase() === vaultId.toLowerCase())
    .map((incentive) => ({
      ...incentive,
      tracked_token_type: encodeTrackedTokenType(incentive.tracked_token_type),
    }));
};

const fetchActivity = async (
  vaultId: string,
  chainId: number,
  reserves: ComputedReserveDataWithMarket[]
): Promise<VaultData['activity']> => {
  const networkConfig = networkConfigs[chainId];
  const baseUrl = networkConfig.explorerLink;

  // Guard clause to handle undefined or empty reserves
  if (!reserves || !Array.isArray(reserves)) {
    console.warn('Reserves array is not valid:', reserves);
    return [];
  }

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

    // Guard clause to handle undefined or empty items
    if (!data.items || !Array.isArray(data.items)) {
      console.warn('API response does not contain valid items array:', data);
      return [];
    }

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

  const isHookGloballyEnabledByOpts = opts?.enabled !== false;
  const areCoreDependenciesReady = !!provider;
  const reservesAreReady = reserves.length > 0;

  const canPotentiallyFetch = isHookGloballyEnabledByOpts && areCoreDependenciesReady;

  // Create safe vaultIds array for mapping
  const safeVaultIds = (!vaultIds || !Array.isArray(vaultIds)) ? [] : vaultIds;

  // Fetch incentives independently to avoid blocking vault queries
  const { data: incentivesData, isLoading: incentivesLoading, isSuccess: incentivesSuccess } = useIncentives({
    enabled: canPotentiallyFetch,
  });

  // Wait for both reserves and incentives to be ready
  const allowIndividualQueryExecution = canPotentiallyFetch && reservesAreReady && incentivesSuccess;

  const individualQueryResults = useQueries({
    queries: safeVaultIds.map((vaultId) => ({
      queryKey: vaultQueryKeys.vaultInList(vaultId, chainId),
      queryFn: async () => {
        if (!provider || !vaultId) {
          throw new Error('Missing required parameters');
        }
        if (!Object.values(ChainIds).includes(chainId)) {
          throw new Error('Invalid chainId');
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
        const [totalAssets, assetAddress, decimals, nameFromContract, latestSnapshot] = await Promise.all([
          vaultDiamondContract.totalAssets().catch(() => 0),
          vaultDiamondContract.asset().catch(() => undefined),
          vaultDiamondContract.decimals().catch(() => 18),
          vaultDiamondContract.name().catch(() => 'Unnamed Vault'),
          fetchVaultData(chainId, vaultId),
        ]);
        let assetDecimals = decimals;
        let assetSymbol = 'UNKNOWN';

        if (assetAddress) {
          const assetContract = new ethers.Contract(
            assetAddress,
            [
              `function decimals() external view returns (uint8)`,
              `function symbol() external view returns (string)`,
            ],
            provider
          );
          [assetDecimals, assetSymbol] = await Promise.all([
            assetContract.decimals().catch(() => 18),
            assetContract.symbol().catch(() => 'UNKNOWN'),
          ]);
        }

        const sharePriceInAsset = await vaultDiamondContract.convertToAssets(
          parseUnits('1', decimals)
        );

        const name = VAULT_ID_TO_NAME[vaultId.toLowerCase() as keyof typeof VAULT_ID_TO_NAME] || nameFromContract;
        const curatorLogo = VAULT_ID_TO_CURATOR_LOGO[vaultId.toLowerCase() as keyof typeof VAULT_ID_TO_CURATOR_LOGO] || undefined;

        const reserve = reserves.find((r) => r.underlyingAsset.toLowerCase() === assetAddress?.toLowerCase());
        // Get incentives for this vault
        const vaultIncentives = incentivesData ? getVaultIncentives(incentivesData, vaultId) : [];
        const vaultData: VaultData = {
          id: vaultId,
          overview: {
            name,
            curatorLogo,
            asset: {
              symbol: assetSymbol || reserve?.symbol || 'UNKNOWN',
              decimals: assetDecimals,
              address: assetAddress,
            },
            sharePrice: Number(formatUnits(sharePriceInAsset, assetDecimals)),
            apy: latestSnapshot?.apyCalculatedLast360Days ? parseFloat(latestSnapshot.apyCalculatedLast360Days) : undefined,
          },
          financials: {
            liquidity: {
              totalAssets: totalAssets.toString(),
            },
          },
          incentives: vaultIncentives,
        };
        return vaultData as unknown as TResult;
      },
      refetchInterval: POLLING_INTERVAL,
      enabled: allowIndividualQueryExecution && !!vaultId,
      ...opts,
    })),
  });

  // Add guard clause to handle undefined or null vaultIds (after all hooks)
  if (!vaultIds || !Array.isArray(vaultIds) || vaultIds.length === 0) {
    return {
      data: [],
      isLoading: false,
      isError: false,
      isSuccess: true,
    };
  }

  if (canPotentiallyFetch && (!reservesAreReady || incentivesLoading)) {
    return {
      data: undefined,
      isLoading: true,
      isError: false,
      isSuccess: false,
    };
  }

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

export type RewardItemEnriched = RewardItem & {
  price: number;
  rewardAmountToClaim: number;
  rewardAmountToClaimInUSD: number;
  symbol: string;
  name: string;
  decimals: number;
  rewardContractAddress: string;
  proof: string[];
};

export const useUserData = <TResult = { userRewards: RewardItemEnriched[] }>(
  userAddress: string,
  opts?: VaultDataHookOpts<{ userRewards: RewardItemEnriched[] }, TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);
  const { reserves } = useAppDataContext();

  const isHookGloballyEnabledByOpts = opts?.enabled !== false;
  const areCoreDependenciesReady = !!provider && !!userAddress;
  const reservesAreReady = reserves.length > 0;

  const canPotentiallyFetch = isHookGloballyEnabledByOpts && areCoreDependenciesReady;

  // Fetch rewards independently to avoid blocking user data query
  const { data: rewardsData, isLoading: rewardsLoading, isSuccess: rewardsSuccess } = useRewards(userAddress, {
    enabled: canPotentiallyFetch,
  });

  // Wait for both reserves and rewards to be ready
  const allowQueryExecution = canPotentiallyFetch && reservesAreReady && rewardsSuccess;

  const queryApiResult = useVaultQuery<{
    userRewards: RewardItemEnriched[];
  }, TResult>(
    vaultQueryKeys.userGlobalData(userAddress, chainId),
    async () => {
      if (!provider || !userAddress || !rewardsData) {
        throw new Error('useUserData: Missing provider, userAddress, or rewards data');
      }

      const userRewards = rewardsData;

      const rewardContractAddress = userRewards?.[0]?.reward_contract_address;
      const rewardContract = new ethers.Contract(
        rewardContractAddress,
        [`function claimed(address account, address reward) external view returns (uint256)`],
        provider
      );

      const claimedRewards = await Promise.all(
        userRewards.map(async (reward) => {
          const rewardToken = reward.reward_token_address;
          let amount: ethers.BigNumber;
          try {
            amount = await rewardContract.claimed(userAddress, rewardToken);
          } catch (error) {
            console.error(`Failed to fetch claimed amount for reward token ${rewardToken} for user ${userAddress} in useUserData:`, error);
            amount = ethers.BigNumber.from(0);
          }
          return {
            amount,
            rewardToken,
          };
        })
      );

      const userRewardsEnriched = userRewards.map((reward) => {
        const reserve = reserves.find((r) => r.underlyingAsset.toLowerCase() === reward.reward_token_address.toLowerCase());
        const rewardAmountToClaimWei = Number(reward.reward_amount_wei) - Number(claimedRewards.find((r) => r.rewardToken === reward.reward_token_address)?.amount || 0);
        const rewardAmountToClaim = Number(formatUnits(rewardAmountToClaimWei.toString(), reserve?.decimals || 18));
        const rewardAmountToClaimInUSD = rewardAmountToClaim * Number(reserve?.priceInUSD || 0);
        return {
          ...reward,
          price: reserve ? Number(reserve.priceInUSD) : 0,
          rewardAmountToClaim: rewardAmountToClaimWei,
          rewardAmountToClaimInUSD,
          symbol: reserve?.symbol,
          name: reserve?.name,
          decimals: reserve?.decimals,
          rewardContractAddress: rewardContractAddress,
          proof: reward.merkle_proof,
        };
      });

      return { userRewards: userRewardsEnriched };
    },
    allowQueryExecution,
    opts
  );

  if (canPotentiallyFetch && (!reservesAreReady || rewardsLoading)) {
    return {
      ...queryApiResult,
      data: undefined,
      isLoading: true,
      isError: false,
      isSuccess: false,
    };
  }

  return queryApiResult;
};

export const useUserVaultsData = <
  TResult = { maxWithdraw: ethers.BigNumber; decimals: number; assetDecimals: number }
>(
  userAddress: string,
  vaultIds: string[],
  opts?: VaultDataHookOpts<{ maxWithdraw: ethers.BigNumber; decimals: number; assetDecimals: number }, TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);

  const areCoreDependenciesReadyForHook = !!provider && !!userAddress;
  const isHookGloballyEnabledByOpts = opts?.enabled !== false;
  const canPotentiallyFetchAny = areCoreDependenciesReadyForHook && isHookGloballyEnabledByOpts;

  // Create safe vaultIds array for mapping
  const safeVaultIds = (!vaultIds || !Array.isArray(vaultIds)) ? [] : vaultIds;

  const queries: UseQueryOptions<TResult, Error, TResult, unknown[]>[] = safeVaultIds.map((vaultId) => {
    const allowIndividualQueryExecution = canPotentiallyFetchAny && !!vaultId && vaultId.trim() !== '';

    return {
      queryKey: vaultQueryKeys.userVaultData(vaultId, userAddress, chainId),
      queryFn: async () => {
        if (!provider || !vaultId || !userAddress) {
          throw new Error(
            `useUserVaultsData: Missing provider (${!!provider}), vaultId (${!!vaultId}), or userAddress (${!!userAddress}) for a vault query`
          );
        }
        if (!Object.values(ChainIds).includes(chainId)) {
          throw new Error(`Invalid chainId: ${chainId}`);
        }

        const vaultDiamondContract = new ethers.Contract(
          vaultId,
          [
            `function maxWithdraw(address user) external view override returns (uint256)`,
            `function decimals() external view returns (uint8)`,
            `function asset() external view returns (address)`,
          ],
          provider
        );

        const [maxWithdrawShares, decimals, assetAddress] = await Promise.all([
          vaultDiamondContract.maxWithdraw(userAddress).catch(() => ethers.BigNumber.from(0)),
          vaultDiamondContract.decimals().catch(() => 18),
          vaultDiamondContract.asset().catch(() => undefined),
        ]);

        let assetDecimals = decimals;

        if (assetAddress) {
          const assetContract = new ethers.Contract(
            assetAddress,
            [
              `function balanceOf(address user) external view returns (uint256)`,
              `function decimals() external view returns (uint8)`,
            ],
            provider
          );
          const [assetDecimalsFromContract] = await Promise.all([
            assetContract.decimals().catch(() => 18),
          ]);

          assetDecimals = assetDecimalsFromContract;
        }

        return {
          maxWithdraw: maxWithdrawShares,
          decimals,
          assetDecimals,
        } as TResult;
      },
      enabled: allowIndividualQueryExecution,
      refetchInterval: POLLING_INTERVAL,
      ...(opts as object), // Spread opts as object to satisfy type constraints more generally
    };
  });

  const results = useQueries({ queries }) as UseQueryResult<TResult, Error>[];

  // Add guard clause to handle undefined or null vaultIds (after all hooks)
  if (!vaultIds || !Array.isArray(vaultIds) || vaultIds.length === 0) {
    return [];
  }

  const refetch = () => {
    // Add guard clause to ensure results is always an array
    if (results && Array.isArray(results)) {
      results.forEach(result => {
        if (result.refetch) {
          result.refetch();
        }
      });
    }
  };

  // Add guard clause to ensure results is always an array
  if (!results || !Array.isArray(results)) {
    return [];
  }

  const extendedResults = results.map(result => ({
    ...result,
    refetch: refetch,
  }));

  return extendedResults;
};

export const useVaultData = <TResult = VaultData>(
  vaultId: string,
  opts?: VaultDataHookOpts<VaultData, TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);
  const { reserves } = useAppDataContext();

  const baseQueryIsEnabled = !!provider && !!vaultId && (opts?.enabled !== false);
  const reservesAreReady = reserves.length > 0;

  const actualQueryExecutionIsEnabled = baseQueryIsEnabled && reservesAreReady;

  // Fetch incentives independently to avoid blocking vault query
  const { data: incentivesData } = useIncentives({
    enabled: baseQueryIsEnabled,
  });

  const canExecuteMainQuery = actualQueryExecutionIsEnabled;

  const queryApiResult = useVaultQuery<VaultData, TResult>(
    vaultQueryKeys.vaultDetailsWithSubgraph(vaultId, chainId),
    async () => {
      if (!provider || !vaultId) {
        throw new Error('Missing required parameters');
      }
      if (!Object.values(ChainIds).includes(chainId)) {
        throw new Error('Invalid chainId');
      }

      const vaultDiamondContract = new ethers.Contract(
        vaultId,
        [
          `function totalAssets() external view override returns (uint256)`,
          `function totalSupply() external view override returns (uint256)`,
          `function asset() external view override returns (address)`,
          `function name() external view override returns (string)`,
          `function decimals() external view returns (uint8)`,
          `function guardian() external view returns (address)`,
          `function curator() external view returns (address)`,
          `function owner() external view returns (address)`,
          `function maxDeposit(address receiver) external view returns (uint256 maxAssets)`,
          `function depositCapacity() external view returns (uint256)`,
          `function convertToAssets(uint256 shares) external view returns (uint256 assets)`,
          `function getWithdrawalTimelock() external view returns (uint256)`,
          `function fee() external view returns (uint256)`,
        ],
        provider
      );

      // Fetch contract data and subgraph data in parallel where possible
      const [
        contractData,
        activityData,
        vaultData,
        historicalSnapshots,
      ] = await Promise.all([
        Promise.all([
          vaultDiamondContract.totalAssets().catch(() => ethers.BigNumber.from(0)),
          vaultDiamondContract.totalSupply().catch(() => ethers.BigNumber.from(0)),
          vaultDiamondContract.asset().catch(() => undefined),
          vaultDiamondContract.name().catch(() => 'Unnamed Vault'),
          vaultDiamondContract.decimals().catch(() => 18),
          vaultDiamondContract.guardian().catch(() => undefined),
          vaultDiamondContract.curator().catch(() => undefined),
          vaultDiamondContract.owner().catch(() => undefined),
          vaultDiamondContract
            .maxDeposit('0x0000000000000000000000000000000000000000')
            .catch(() => ethers.BigNumber.from(0)),
          vaultDiamondContract.depositCapacity().catch(() => ethers.BigNumber.from(0)),
          vaultDiamondContract.convertToAssets(parseUnits('1', (await vaultDiamondContract.decimals().catch(() => 18)).toString())).catch(() => ethers.BigNumber.from(0)),
          vaultDiamondContract.getWithdrawalTimelock().catch(() => 0),
          vaultDiamondContract.fee().catch(() => 0),
        ]),
        fetchActivity(vaultId, chainId, reserves).catch(() => []),
        fetchVaultData(chainId, vaultId),
        fetchVaultHistoricalSnapshots(chainId, vaultId),
      ]);

      const [
        totalAssets,
        totalSupply,
        assetAddress,
        nameFromContract,
        decimals,
        guardian,
        curator,
        owner,
        maxDeposit,
        depositCapacity,
        sharePriceInAsset,
        withdrawalTimelock,
        fee,
      ] = contractData;

      let assetDecimals = decimals;
      let assetSymbol;
      let assetName;

      if (assetAddress) {
        const assetContract = new ethers.Contract(
          assetAddress,
          [
            `function balanceOf(address user) external view returns (uint256)`,
            `function decimals() external view returns (uint8)`,
            `function symbol() external view returns (string)`,
            `function name() external view returns (string)`,
          ],
          provider
        );
        [assetDecimals, assetSymbol, assetName] = await Promise.all([
          assetContract.decimals().catch(() => 18),
          assetContract.symbol().catch(() => 'UNKNOWN'),
          assetContract.name().catch(() => 'Unknown Token'),
        ]);
      }

      const name = VAULT_ID_TO_NAME[vaultId.toLowerCase() as keyof typeof VAULT_ID_TO_NAME] || nameFromContract;
      const curatorLogo = VAULT_ID_TO_CURATOR_LOGO[vaultId.toLowerCase() as keyof typeof VAULT_ID_TO_CURATOR_LOGO] || undefined;

      const reserve = reserves.find((r) => r.underlyingAsset.toLowerCase() === assetAddress?.toLowerCase());

      // Get incentives for this vault
      const vaultIncentives = incentivesData ? getVaultIncentives(incentivesData, vaultId) : [];

      return {
        id: vaultId,
        overview: {
          name,
          curatorLogo,
          asset: {
            name: assetName || reserve?.name || 'UNKNOWN',
            symbol: assetSymbol || reserve?.symbol || 'UNKNOWN',
            decimals: assetDecimals,
            address: assetAddress,
          },
          sharePrice: Number(formatUnits(sharePriceInAsset, assetDecimals)),
          decimals: decimals, // vault decimals
          roles: {
            guardian,
            curator,
            owner,
          },
          apy: vaultData?.apyCalculatedLast360Days ? parseFloat(vaultData.apyCalculatedLast360Days) : undefined,
          historicalSnapshots: {
            apy: formatSnapshotsForChart(historicalSnapshots, 'apy'),
            totalSupply: formatSnapshotsForChart(historicalSnapshots, 'totalSupply'),
          },
          withdrawalTimelock: withdrawalTimelock.toString(),
          fee: fee.toString(),
          creationTimestamp: vaultData?.creationTimestamp.toString(),
        },
        financials: {
          liquidity: {
            totalAssets: totalAssets.toString(),
            totalSupply: totalSupply.toString(),
            maxDeposit: maxDeposit.toString(),
            depositCapacity: depositCapacity.toString(),
          },
        },
        activity: activityData,
        incentives: vaultIncentives,
      };
    },
    canExecuteMainQuery,
    opts
  );

  if (baseQueryIsEnabled && !reservesAreReady) {
    return {
      ...queryApiResult,
      status: 'loading',
      isLoading: true,
      isFetching: true,
      isSuccess: false,
      isError: false,
      data: undefined,
    } as UseQueryResult<TResult, Error>;
  }

  return queryApiResult;
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
      if (!Object.values(ChainIds).includes(chainId)) {
        throw new Error('Invalid chainId');
      }

      const vaultFactoryContract = new ethers.Contract(
        vaultsConfig[chainId].addresses.VAULT_FACTORY,
        [`function getDeployedVaults() external view returns (address[] memory)`],
        provider
      );

      const allVaultIds = await vaultFactoryContract.getDeployedVaults();
      const hiddenVaultsEnv = process.env.NEXT_PUBLIC_HIDDEN_VAULT_IDS || '';
      const hiddenVaultIds = hiddenVaultsEnv.split(',').map(id => id.trim().toLowerCase());

      const filteredVaultIds = allVaultIds.filter(
        (vaultId: string) => !hiddenVaultIds.includes(vaultId.toLowerCase())
      );

      return filteredVaultIds;
    },
    !!provider,
    opts
  );
};
