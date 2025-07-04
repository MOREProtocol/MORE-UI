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

interface RewardItem {
  merkleroot: string;
  amount: string;
  rewardtoken: string;
  proof: string[];
}

const fetchRewards = async ({ userAddress }: { userAddress: string }): Promise<RewardItem[]> => {
  try {
    // TODO: update to use the new API
    const response = await fetch(`http://localhost:3001/api/user?userAddress=${userAddress}`);
    if (!response.ok) {
      throw new Error(`Error fetching rewards: ${response.statusText}`);
    }
    const data: RewardItem[] = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch rewards:", error);
    return [];
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

  const isHookGloballyEnabledByOpts = opts?.enabled !== false;
  const areCoreDependenciesReady = !!provider;
  const reservesAreReady = reserves.length > 0;

  const canPotentiallyFetch = isHookGloballyEnabledByOpts && areCoreDependenciesReady;

  const allowIndividualQueryExecution = canPotentiallyFetch && reservesAreReady;

  const individualQueryResults = useQueries({
    queries: vaultIds.map((vaultId) => ({
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
        const [totalAssets, assetAddress, decimals, nameFromContract] = await Promise.all([
          vaultDiamondContract.totalAssets().catch(() => 0),
          vaultDiamondContract.asset().catch(() => undefined),
          vaultDiamondContract.decimals().catch(() => 18),
          vaultDiamondContract.name().catch(() => 'Unnamed Vault'),
        ]);
        let assetDecimals = decimals;
        if (assetAddress) {
          const assetContract = new ethers.Contract(
            assetAddress,
            [
              `function decimals() external view returns (uint8)`,
            ],
            provider
          );
          assetDecimals = await assetContract.decimals().catch(() => 18)
        }

        const sharePriceInAsset = await vaultDiamondContract.convertToAssets(
          parseUnits('1', decimals)
        );

        const name = VAULT_ID_TO_NAME[vaultId.toLowerCase() as keyof typeof VAULT_ID_TO_NAME] || nameFromContract;
        const curatorLogo = VAULT_ID_TO_CURATOR_LOGO[vaultId.toLowerCase() as keyof typeof VAULT_ID_TO_CURATOR_LOGO] || undefined;

        const reserve = reserves.find((r) => r.underlyingAsset.toLowerCase() === assetAddress?.toLowerCase());
        const vaultData: VaultData = {
          id: vaultId,
          overview: {
            name,
            curatorLogo,
            asset: {
              symbol: reserve?.symbol,
              decimals: assetDecimals,
              address: assetAddress,
            },
            sharePrice: Number(formatUnits(sharePriceInAsset, assetDecimals)),
            sharePriceInUSD: Number(reserve?.formattedPriceInMarketReferenceCurrency || 0),
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
      enabled: allowIndividualQueryExecution && !!vaultId,
      ...opts,
    })),
  });

  if (canPotentiallyFetch && !reservesAreReady) {
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

type RewardItemEnriched = RewardItem & {
  price: number;
  amountInUSD: number;
  rewardAmountToClaim: number;
  rewardAmountToClaimInUSD: number;
};

export const useUserData = <TResult = { userRewards: RewardItemEnriched[], claimedRewards: { amount: ethers.BigNumber, rewardToken: string }[] }>(
  userAddress: string,
  opts?: VaultDataHookOpts<{ userRewards: RewardItemEnriched[], claimedRewards: { amount: ethers.BigNumber, rewardToken: string }[] }, TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);
  const { reserves } = useAppDataContext();

  const isHookEnabled = !!provider && !!userAddress && (opts?.enabled !== false);

  return useVaultQuery<{
    userRewards: RewardItemEnriched[];
    claimedRewards: { amount: ethers.BigNumber; rewardToken: string }[];
  }, TResult>(
    vaultQueryKeys.userGlobalData(userAddress, chainId),
    async () => {
      if (!provider || !userAddress) {
        throw new Error('useUserData: Missing provider or userAddress');
      }

      const userRewards = await fetchRewards({ userAddress });
      const rewardTokens = userRewards.map((reward) => reward.rewardtoken);

      // TODO: move reward contract address to config
      const rewardContractAddress = "0xCC53F325fAA69dC4b414B0d3F02fc9A2fEA92eCE";
      const rewardContract = new ethers.Contract(
        rewardContractAddress,
        [`function claimed(address account, address reward) external view returns (uint256)`],
        provider
      );

      const claimedRewards = await Promise.all(
        rewardTokens.map(async (rewardToken) => {
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
        const reserve = reserves.find((r) => r.underlyingAsset.toLowerCase() === reward.rewardtoken.toLowerCase());
        const rewardAmountToClaim = Number(formatUnits(reward.amount, reserve?.decimals)) - Number(formatUnits(claimedRewards.find((r) => r.rewardToken === reward.rewardtoken)?.amount || 0, reserve?.decimals));
        const rewardAmountToClaimInUSD = rewardAmountToClaim * Number(reserve?.priceInUSD || 0);
        return {
          ...reward,
          price: reserve ? Number(reserve.priceInUSD) : 0,
          amountInUSD: Number(formatUnits(reward.amount, reserve?.decimals)) * Number(reserve?.priceInUSD || 0),
          rewardAmountToClaim,
          rewardAmountToClaimInUSD,
        };
      });

      return { userRewards: userRewardsEnriched, claimedRewards };
    },
    isHookEnabled,
    opts
  );
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

  // Explicitly type the array of query options
  const queries: UseQueryOptions<TResult, Error, TResult, unknown[]>[] = vaultIds.map((vaultId) => {
    const allowIndividualQueryExecution = canPotentiallyFetchAny && !!vaultId;
    return {
      queryKey: vaultQueryKeys.userVaultData(vaultId, userAddress, chainId),
      queryFn: async () => {
        if (!provider || !vaultId || !userAddress) {
          throw new Error(
            'useUserVaultsData: Missing provider, vaultId, or userAddress for a vault query'
          );
        }
        if (!Object.values(ChainIds).includes(chainId)) {
          throw new Error('Invalid chainId');
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

        const finalMaxWithdraw = maxWithdrawShares;
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
            // assetContract.balanceOf(vaultId).catch(() => ethers.BigNumber.from(0)),
            assetContract.decimals().catch(() => 18),
          ]);

          // if (maxWithdrawShares.gt(vaultAssetBalance)) {
          //   finalMaxWithdraw = vaultAssetBalance;
          // }
          assetDecimals = assetDecimalsFromContract;
        }

        return {
          maxWithdraw: finalMaxWithdraw,
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

  // Add a refetch function that refetches all queries
  const refetch = () => {
    results.forEach(result => {
      if (result.refetch) {
        result.refetch();
      }
    });
  };

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
          `function asset() external view override returns (address)`,
          `function name() external view override returns (string)`,
          `function decimals() external view returns (uint8)`,
          `function guardian() external view returns (address)`,
          `function curator() external view returns (address)`,
          `function owner() external view returns (address)`,
          `function maxDeposit(address receiver) external view returns (uint256 maxAssets)`,
          `function convertToAssets(uint256 shares) external view returns (uint256 assets)`,
          `function getWithdrawalTimelock() external view returns (uint256)`,
          `function fee() external view returns (uint256)`,
        ],
        provider
      );

      // Fetch contract data and subgraph data in parallel where possible
      const [
        contractData,
        allocationData,
        activityData,
        vaultData,
        historicalSnapshots,
      ] = await Promise.all([
        Promise.all([
          vaultDiamondContract.totalAssets().catch(() => ethers.BigNumber.from(0)),
          vaultDiamondContract.asset().catch(() => undefined),
          vaultDiamondContract.name().catch(() => 'Unnamed Vault'),
          vaultDiamondContract.decimals().catch(() => 18),
          vaultDiamondContract.guardian().catch(() => undefined),
          vaultDiamondContract.curator().catch(() => undefined),
          vaultDiamondContract.owner().catch(() => undefined),
          vaultDiamondContract
            .maxDeposit('0x0000000000000000000000000000000000000000')
            .catch(() => ethers.BigNumber.from(0)),
          vaultDiamondContract.convertToAssets(parseUnits('1', (await vaultDiamondContract.decimals().catch(() => 18)).toString())).catch(() => ethers.BigNumber.from(0)),
          vaultDiamondContract.getWithdrawalTimelock().catch(() => 0),
          vaultDiamondContract.fee().catch(() => 0),
        ]),
        fetchAllocation(vaultId, chainId, reserves).catch(() => []),
        fetchActivity(vaultId, chainId, reserves).catch(() => []),
        fetchVaultData(chainId, vaultId),
        fetchVaultHistoricalSnapshots(chainId, vaultId),
      ]);

      const [
        totalAssets,
        assetAddress,
        nameFromContract,
        decimals,
        guardian,
        curator,
        owner,
        maxDeposit,
        sharePriceInAsset,
        withdrawalTimelock,
        fee,
      ] = contractData;

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
        assetDecimals = await assetContract.decimals().catch(() => 18)
      }

      const name = VAULT_ID_TO_NAME[vaultId.toLowerCase() as keyof typeof VAULT_ID_TO_NAME] || nameFromContract;
      const curatorLogo = VAULT_ID_TO_CURATOR_LOGO[vaultId.toLowerCase() as keyof typeof VAULT_ID_TO_CURATOR_LOGO] || undefined;

      const reserve = reserves.find((r) => r.underlyingAsset.toLowerCase() === assetAddress?.toLowerCase());

      const latestSnapshot = historicalSnapshots?.[0];

      return {
        id: vaultId,
        overview: {
          name,
          curatorLogo,
          asset: {
            symbol: reserve?.symbol,
            decimals: assetDecimals,
            address: assetAddress,
          },
          sharePrice: Number(formatUnits(sharePriceInAsset, assetDecimals)),
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
            maxDeposit: maxDeposit.toString(),
          },
          returnMetrics: {
            dayToDate: latestSnapshot?.return1D ? parseFloat(latestSnapshot.return1D) : undefined,
            weekToDate: latestSnapshot?.return7D ? parseFloat(latestSnapshot.return7D) : undefined,
            monthToDate: latestSnapshot?.return30D ? parseFloat(latestSnapshot.return30D) : undefined,
            halfYearToDate: latestSnapshot?.return180D ? parseFloat(latestSnapshot.return180D) : undefined,
          },
        },
        allocation: allocationData,
        activity: activityData,
      };
    },
    actualQueryExecutionIsEnabled,
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
