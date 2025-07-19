import { ethers } from 'ethers';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVault } from './useVault';
import { useVaultProvider, useAssetsData, vaultQueryKeys, VaultDataHookOpts, AssetData } from './useVaultData';

// Token ID constants for the vault contract
const TOKEN_IDS = {
  MTOKENS_ID: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MTOKENS_ID")),
  MORE_DEBT_TOKENS_ID: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MORE_DEBT_TOKENS_ID")),
  CURVE_LP_TOKENS_ID: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CURVE_LP_TOKENS_ID")),
  ORIGAMI_VAULT_TOKENS_ID: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ORIGAMI_VAULT_TOKENS_ID")),
};

// Staking ID constants for the vault contract
const STAKING_IDS = {
  MULTI_REWARDS_STAKINGS_ID: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MULTI_REWARDS_STAKINGS_ID")),
  CURVE_LIQUIDITY_GAUGES_V6_ID: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CURVE_LIQUIDITY_GAUGES_V6_ID")),
};

export interface VaultAllocationItem {
  assetName: string;
  assetSymbol: string;
  assetAddress: string;
  type: string;
  market: string;
  balance: number;
  price: number;
  value: number;
}

export interface VaultStakedItem {
  assetName: string;
  assetSymbol: string;
  assetAddress: string;
  type: string;
  market: string;
  stakedAmount: number;
  price: number;
  value: number;
}

export interface VaultAvailableAssetItem {
  assetName: string;
  assetSymbol: string;
  assetAddress: string;
  type: string;
  market: string;
  balance: number;
  price: number;
  value: number;
}

interface VaultCombinedData {
  allocation: VaultAllocationItem[];
  staked: VaultStakedItem[];
  available: VaultAvailableAssetItem[];
}

// Type mapping for different token categories (LP tokens)
const getTokenType = (tokenId: string): string => {
  switch (tokenId) {
    case TOKEN_IDS.MTOKENS_ID:
      return 'LP_M_TOKENS';
    case TOKEN_IDS.MORE_DEBT_TOKENS_ID:
      return 'LP_MORE_DEBT_TOKENS';
    case TOKEN_IDS.CURVE_LP_TOKENS_ID:
      return 'LP_CURVE_LP_TOKENS';
    case TOKEN_IDS.ORIGAMI_VAULT_TOKENS_ID:
      return 'LP_ORIGAMI_VAULT_TOKENS';
    default:
      return 'LP_UNKNOWN';
  }
};

// Type mapping for different staking categories
const getStakingType = (stakingId: string): string => {
  switch (stakingId) {
    case STAKING_IDS.MULTI_REWARDS_STAKINGS_ID:
      return 'STAKING_MULTI_REWARDS';
    case STAKING_IDS.CURVE_LIQUIDITY_GAUGES_V6_ID:
      return 'STAKING_CURVE_LIQUIDITY_GAUGES_V6';
    default:
      return 'STAKING_UNKNOWN';
  }
};

// Type for normal ERC20 tokens
const getAvailableAssetType = (): string => {
  return 'ERC20_TOKEN';
};

const fetchVaultAllocation = async (
  vaultId: string,
  provider: ethers.providers.Provider
): Promise<{ tokensByCategory: Record<string, string[]>; allTokenAddresses: string[] }> => {
  if (!provider || !vaultId) {
    throw new Error('Missing required parameters for vault allocation');
  }

  try {
    const vaultContract = new ethers.Contract(
      vaultId,
      [
        'function tokensHeld(bytes32 tokenId) external view returns (address[] memory)',
      ],
      provider
    );

    const tokenCategories = Object.entries(TOKEN_IDS);
    const tokensByCategory: Record<string, string[]> = {};
    const allTokenAddresses: string[] = [];

    // Fetch tokens for each category
    for (const [categoryName, tokenId] of tokenCategories) {
      try {
        const tokens: string[] = await vaultContract.tokensHeld(tokenId);
        tokensByCategory[categoryName] = tokens;
        allTokenAddresses.push(...tokens);
      } catch (error) {
        console.warn(`Failed to fetch tokens for category ${categoryName}:`, error);
        tokensByCategory[categoryName] = [];
      }
    }

    return { tokensByCategory, allTokenAddresses };
  } catch (error) {
    console.warn(`Vault contract at ${vaultId} does not support tokensHeld method or has incompatible interface:`, error);
    // Return empty allocation data for contracts that don't support this functionality
    return {
      tokensByCategory: {
        MTOKENS_ID: [],
        MORE_DEBT_TOKENS_ID: [],
        CURVE_LP_TOKENS_ID: [],
        ORIGAMI_VAULT_TOKENS_ID: [],
      },
      allTokenAddresses: []
    };
  }
};

const fetchTokenBalances = async (
  vaultId: string,
  tokenAddresses: string[],
  provider: ethers.providers.Provider
): Promise<Record<string, ethers.BigNumber>> => {
  const balances: Record<string, ethers.BigNumber> = {};

  if (!tokenAddresses || tokenAddresses.length === 0) {
    return balances;
  }

  // Fetch balances for all tokens with individual error handling
  const balancePromises = tokenAddresses.map(async (tokenAddress) => {
    try {
      if (!tokenAddress || !ethers.utils.isAddress(tokenAddress)) {
        console.warn(`Invalid token address: ${tokenAddress}`);
        return { tokenAddress, balance: ethers.BigNumber.from(0) };
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address owner) external view returns (uint256)'],
        provider
      );

      // Add timeout to prevent hanging
      const balance = await Promise.race([
        tokenContract.balanceOf(vaultId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]) as ethers.BigNumber;

      return { tokenAddress, balance };
    } catch (error) {
      console.warn(`Failed to fetch balance for token ${tokenAddress}:`, error);
      return { tokenAddress, balance: ethers.BigNumber.from(0) };
    }
  });

  try {
    const results = await Promise.allSettled(balancePromises);
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { tokenAddress, balance } = result.value;
        balances[tokenAddress] = balance;
      }
    });
  } catch (error) {
    console.error('Error in fetchTokenBalances Promise.allSettled:', error);
  }

  return balances;
};

const fetchVaultStakingAddresses = async (
  vaultId: string,
  provider: ethers.providers.Provider
): Promise<{ stakingByCategory: Record<string, string[]>; allStakingTokenAddresses: string[] }> => {
  if (!provider || !vaultId) {
    throw new Error('Missing required parameters for vault staking');
  }

  try {
    const vaultContract = new ethers.Contract(
      vaultId,
      [
        'function getStakingAddresses(bytes32 stakingFacetId) external view returns (address[] memory)',
      ],
      provider
    );

    const stakingCategories = Object.entries(STAKING_IDS);
    const stakingByCategory: Record<string, string[]> = {};
    const allStakingTokenAddresses: string[] = [];

    // Fetch staking addresses for each category
    for (const [categoryName, stakingId] of stakingCategories) {
      try {
        const stakingContractAddresses: string[] = await vaultContract.getStakingAddresses(stakingId);

        // For each staking contract, get the staking token address
        const stakingTokenAddresses: string[] = [];
        for (const stakingContractAddress of stakingContractAddresses) {
          try {
            if (!stakingContractAddress || !ethers.utils.isAddress(stakingContractAddress)) {
              console.warn(`Invalid staking contract address: ${stakingContractAddress}`);
              continue;
            }

            const stakingContract = new ethers.Contract(
              stakingContractAddress,
              ['function stakingToken() external view returns (address)'],
              provider
            );

            const stakingTokenAddress = await Promise.race([
              stakingContract.stakingToken(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 10000)
              )
            ]) as string;

            if (stakingTokenAddress && ethers.utils.isAddress(stakingTokenAddress)) {
              stakingTokenAddresses.push(stakingTokenAddress);
            }
          } catch (error) {
            console.warn(`Failed to fetch staking token for contract ${stakingContractAddress}:`, error);
          }
        }

        stakingByCategory[categoryName] = stakingTokenAddresses;
        allStakingTokenAddresses.push(...stakingTokenAddresses);
      } catch (error) {
        console.warn(`Failed to fetch staking addresses for category ${categoryName}:`, error);
        stakingByCategory[categoryName] = [];
      }
    }

    return { stakingByCategory, allStakingTokenAddresses };
  } catch (error) {
    console.warn(`Vault contract at ${vaultId} does not support getStakingAddresses method or has incompatible interface:`, error);
    // Return empty staking data for contracts that don't support this functionality
    return {
      stakingByCategory: {
        MULTI_REWARDS_STAKINGS_ID: [],
        CURVE_LIQUIDITY_GAUGES_V6_ID: [],
      },
      allStakingTokenAddresses: []
    };
  }
};

const fetchStakedAmounts = async (
  vaultId: string,
  stakingTokenAddresses: string[],
  provider: ethers.providers.Provider
): Promise<Record<string, ethers.BigNumber>> => {
  const stakedAmounts: Record<string, ethers.BigNumber> = {};

  if (!stakingTokenAddresses || stakingTokenAddresses.length === 0) {
    return stakedAmounts;
  }

  // Fetch staked amounts for all staking token addresses with individual error handling
  const stakedAmountPromises = stakingTokenAddresses.map(async (stakingTokenAddress) => {
    try {
      if (!stakingTokenAddress || !ethers.utils.isAddress(stakingTokenAddress)) {
        console.warn(`Invalid staking token address: ${stakingTokenAddress}`);
        return { stakingTokenAddress, stakedAmount: ethers.BigNumber.from(0) };
      }

      const vaultContract = new ethers.Contract(
        vaultId,
        ['function stakedAmountOfAsset(address asset) external view returns (uint256)'],
        provider
      );

      // Add timeout to prevent hanging
      const stakedAmount = await Promise.race([
        vaultContract.stakedAmountOfAsset(stakingTokenAddress),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]) as ethers.BigNumber;

      return { stakingTokenAddress, stakedAmount };
    } catch (error) {
      console.warn(`Failed to fetch staked amount for staking token ${stakingTokenAddress}:`, error);
      return { stakingTokenAddress, stakedAmount: ethers.BigNumber.from(0) };
    }
  });

  try {
    const results = await Promise.allSettled(stakedAmountPromises);
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { stakingTokenAddress, stakedAmount } = result.value;
        stakedAmounts[stakingTokenAddress] = stakedAmount;
      }
    });
  } catch (error) {
    console.error('Error in fetchStakedAmounts Promise.allSettled:', error);
  }

  return stakedAmounts;
};

const fetchAvailableAssets = async (
  vaultId: string,
  provider: ethers.providers.Provider
): Promise<string[]> => {
  if (!provider || !vaultId) {
    throw new Error('Missing required parameters for available assets');
  }

  try {
    const vaultContract = new ethers.Contract(
      vaultId,
      [
        'function getAvailableAssets() external view returns (address[] memory)',
      ],
      provider
    );

    const availableAssets: string[] = await vaultContract.getAvailableAssets();

    return availableAssets;
  } catch (error) {
    console.warn(`Vault contract at ${vaultId} does not support getAvailableAssets method or has incompatible interface:`, error);
    // Return empty array for contracts that don't support this functionality
    return [];
  }
};

/**
 * Hook to fetch comprehensive vault allocation data across three categories:
 * 1. LP Tokens (allocation) - via tokensHeld() + balanceOf() contract calls
 * 2. Staking Assets (staked) - via getStakingAddresses() → stakingToken() → stakedAmountOfAsset() calls  
 * 3. ERC20 Tokens (available) - via getAvailableAssets() + balanceOf() calls
 * 
 * Staking flow:
 * - getStakingAddresses(stakingId) returns staking contract addresses
 * - stakingContract.stakingToken() returns the actual token being staked
 * - vault.stakedAmountOfAsset(stakingTokenAddress) returns the staked amount
 * 
 * Features:
 * - Progressive loading: Shows data as soon as any category succeeds
 * - Individual error handling: Failed tokens don't block successful ones
 * - Timeout protection: 10s max per token to prevent hanging
 * - Graceful degradation: Shows fallback data for missing asset info
 */
export const useVaultAllocation = <TResult = { allocation: VaultAllocationItem[]; staked: VaultStakedItem[]; available: VaultAvailableAssetItem[] }>(
  vaultId: string,
  opts?: VaultDataHookOpts<{ allocation: VaultAllocationItem[]; staked: VaultStakedItem[]; available: VaultAvailableAssetItem[] }, TResult>
) => {
  const { chainId } = useVault();
  const provider = useVaultProvider(chainId);

  const baseQueryIsEnabled = !!provider && !!vaultId && (opts?.enabled !== false);

  // Base query configuration for contract calls
  const contractQueryConfig = {
    enabled: baseQueryIsEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  };

  // Fetch token addresses from vault contract
  const {
    data: vaultTokenData,
    isError: isTokensError,
    isSuccess: isTokensSuccess,
  } = useQuery({
    queryKey: [...vaultQueryKeys.vaultDetailsWithSubgraph(vaultId, chainId), 'allocation', 'tokens'],
    queryFn: () => fetchVaultAllocation(vaultId, provider!),
    ...contractQueryConfig,
  });

  // Fetch staking addresses from vault contract
  const {
    data: vaultStakingData,
    isError: isStakingError,
    isSuccess: isStakingSuccess,
  } = useQuery({
    queryKey: [...vaultQueryKeys.vaultDetailsWithSubgraph(vaultId, chainId), 'staking', 'addresses'],
    queryFn: () => fetchVaultStakingAddresses(vaultId, provider!),
    ...contractQueryConfig,
  });

  // Fetch available assets from vault contract
  const {
    data: availableAssets,
    isError: isAvailableAssetsError,
    isSuccess: isAvailableAssetsSuccess,
  } = useQuery({
    queryKey: [...vaultQueryKeys.vaultDetailsWithSubgraph(vaultId, chainId), 'available', 'assets'],
    queryFn: () => fetchAvailableAssets(vaultId, provider!),
    ...contractQueryConfig,
  });

  // Get unique token addresses for asset data fetching
  const uniqueTokenAddresses = useMemo(() => {
    if (!vaultTokenData?.allTokenAddresses) return [];
    return Array.from(new Set(vaultTokenData.allTokenAddresses));
  }, [vaultTokenData]);

  // Get unique staking addresses for asset data fetching
  const uniqueStakingAddresses = useMemo(() => {
    if (!vaultStakingData?.allStakingTokenAddresses) return [];
    return Array.from(new Set(vaultStakingData.allStakingTokenAddresses));
  }, [vaultStakingData]);

  // Get unique available asset addresses
  const uniqueAvailableAssets = useMemo(() => {
    if (!availableAssets || !Array.isArray(availableAssets)) return [];
    return Array.from(new Set(availableAssets));
  }, [availableAssets]);

  // Combine all unique addresses for asset data
  const allUniqueAddresses = useMemo(() => {
    return Array.from(new Set([...uniqueTokenAddresses, ...uniqueStakingAddresses, ...uniqueAvailableAssets]));
  }, [uniqueTokenAddresses, uniqueStakingAddresses, uniqueAvailableAssets]);

  // Base query configuration for balance/amount queries (more frequent updates)
  const balanceQueryConfig = {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes  
    retry: 1, // Fast fallback for failed tokens
    retryDelay: 500,
  };

  // Fetch asset data (prices, decimals, etc.) for all tokens
  const {
    data: assetsData,
    isLoading: isAssetsLoading,
  } = useAssetsData(allUniqueAddresses, {
    enabled: baseQueryIsEnabled && (isTokensSuccess || isStakingSuccess || isAvailableAssetsSuccess) && allUniqueAddresses.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    retryDelay: 500,
  });

  // Fetch token balances
  const {
    data: tokenBalances,
  } = useQuery({
    queryKey: [...vaultQueryKeys.vaultDetailsWithSubgraph(vaultId, chainId), 'allocation', 'balances'],
    queryFn: () => fetchTokenBalances(vaultId, uniqueTokenAddresses, provider!),
    enabled: baseQueryIsEnabled && isTokensSuccess && uniqueTokenAddresses.length > 0,
    ...balanceQueryConfig,
  });

  // Fetch staked amounts
  const {
    data: stakedAmounts,
  } = useQuery({
    queryKey: [...vaultQueryKeys.vaultDetailsWithSubgraph(vaultId, chainId), 'staking', 'amounts'],
    queryFn: () => fetchStakedAmounts(vaultId, uniqueStakingAddresses as string[], provider!),
    enabled: baseQueryIsEnabled && isStakingSuccess && uniqueStakingAddresses.length > 0,
    ...balanceQueryConfig,
  });

  // Fetch available asset balances
  const {
    data: availableAssetBalances,
  } = useQuery({
    queryKey: [...vaultQueryKeys.vaultDetailsWithSubgraph(vaultId, chainId), 'available', 'balances'],
    queryFn: () => fetchTokenBalances(vaultId, uniqueAvailableAssets as string[], provider!),
    enabled: baseQueryIsEnabled && isAvailableAssetsSuccess && uniqueAvailableAssets.length > 0,
    ...balanceQueryConfig,
  });

  // Helper function to safely process token data with fallbacks
  const processTokenData = (
    tokenAddress: string,
    balance: ethers.BigNumber | undefined,
    assetData: AssetData | undefined,
    type: string
  ) => {
    if (balance === undefined) return null;

    try {
      const decimals = assetData?.decimals || 18;
      const price = assetData?.price || 0;
      const symbol = assetData?.symbol || 'UNKNOWN';
      const name = assetData?.name || 'Unknown Token';

      const balanceFormatted = Number(ethers.utils.formatUnits(balance || ethers.BigNumber.from(0), decimals));
      const value = balanceFormatted * price;

      return {
        assetName: name,
        assetSymbol: symbol,
        assetAddress: tokenAddress,
        type,
        market: 'Flow',
        balance: balanceFormatted,
        price,
        value,
      };
    } catch (error) {
      console.warn(`Failed to process token ${tokenAddress}:`, error);
      return null;
    }
  };

  // Combine all data into the final allocation, staking, and available assets structure
  const combinedData = useMemo(() => {
    // Wait for at least one category to succeed
    if (!isTokensSuccess && !isStakingSuccess && !isAvailableAssetsSuccess) {
      return undefined;
    }

    const allocation: VaultAllocationItem[] = [];
    const staked: VaultStakedItem[] = [];
    const available: VaultAvailableAssetItem[] = [];

    // Process allocation tokens (LP tokens)
    if (vaultTokenData?.allTokenAddresses.length && tokenBalances) {
      Object.entries(vaultTokenData.tokensByCategory).forEach(([categoryName, tokenAddresses]) => {
        tokenAddresses.forEach((tokenAddress) => {
          const assetData = assetsData?.find(asset => asset.address.toLowerCase() === tokenAddress.toLowerCase());
          const balance = tokenBalances[tokenAddress];
          const processed = processTokenData(tokenAddress, balance, assetData, getTokenType(categoryName));
          if (processed) allocation.push(processed);
        });
      });
    }

    // Process staking tokens
    if (vaultStakingData?.allStakingTokenAddresses.length && stakedAmounts) {
      Object.entries(vaultStakingData.stakingByCategory).forEach(([categoryName, stakingAddresses]) => {
        stakingAddresses.forEach((stakingAddress) => {
          const assetData = assetsData?.find(asset => asset.address.toLowerCase() === stakingAddress.toLowerCase());
          const stakedAmount = stakedAmounts[stakingAddress];
          const processed = processTokenData(stakingAddress, stakedAmount, assetData, getStakingType(categoryName));
          if (processed) {
            // Convert to staking format
            staked.push({
              ...processed,
              stakedAmount: processed.balance,
            } as VaultStakedItem);
          }
        });
      });
    }

    // Process available assets (ERC20 tokens)
    if (availableAssets?.length && availableAssetBalances) {
      availableAssets.forEach((assetAddress) => {
        const assetData = assetsData?.find(asset => asset.address.toLowerCase() === assetAddress.toLowerCase());
        const balance = availableAssetBalances[assetAddress];
        const processed = processTokenData(assetAddress, balance, assetData, getAvailableAssetType());
        if (processed) available.push(processed as VaultAvailableAssetItem);
      });
    }

    return { allocation, staked, available } as TResult;
  }, [vaultTokenData, vaultStakingData, availableAssets, assetsData, tokenBalances, stakedAmounts, availableAssetBalances, isTokensSuccess, isStakingSuccess, isAvailableAssetsSuccess]);

  // Loading state logic: Progressive data loading approach
  // - Show loading until we have at least one category of addresses
  // - Show partial data as soon as any category completes successfully  
  // - Don't block on individual hanging queries - show what we have
  // - Only show error if ALL main contract queries fail
  const hasAnyAddressData = isTokensSuccess || isStakingSuccess || isAvailableAssetsSuccess;

  // Only show loading if we don't have any address data yet, or if assets are loading but we need them
  const needsAssetData = hasAnyAddressData && !assetsData && isAssetsLoading;
  const hasPartialData = combinedData !== undefined && (
    (combinedData as VaultCombinedData).allocation?.length > 0 ||
    (combinedData as VaultCombinedData).staked?.length > 0 ||
    (combinedData as VaultCombinedData).available?.length > 0
  );

  // Progressive loading: show data as soon as we have anything useful
  const isLoading = !hasAnyAddressData || (needsAssetData && !hasPartialData);
  const isError = isTokensError && isStakingError && isAvailableAssetsError;
  const isSuccess = hasAnyAddressData && combinedData !== undefined;

  return {
    data: combinedData,
    isLoading,
    isError,
    isSuccess,
  };
};
