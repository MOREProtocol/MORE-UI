import { useRouter } from 'next/router';
import React, { createContext, JSX, ReactNode, useContext, useEffect, useState } from 'react';

// Define standardized types for monetary values
export interface MonetaryValue {
  value: number; // Numeric value
  currency: string; // The currency symbol or name
}

// Define fee structure
export interface Fee {
  percentage: number; // Fee percentage as a number (e.g., 0.25)
  recipient: string; // Address of the fee recipient
}

// Define roles in the vault
export interface VaultRoles {
  owner: string;
  manager: string;
  guardian: string;
}

// Define return metrics
export interface ReturnMetrics {
  monthToDate: number;
  quarterToDate: number;
  yearToDate: number;
  inceptionToDate: number;
  averageMonth: number;
  bestMonth: number;
  worstMonth: number;
  trackRecord: number; // Number of months
}

// Define the complete vault data structure
export interface VaultData {
  overview: {
    id: string;
    name: string;
    description: string;
    sharePrice: number;
    shareCurrency: string;
    curator: string;
    roles: VaultRoles;
  };
  financials: {
    basics: {
      grossAssetValue: MonetaryValue;
      netAssetValue: MonetaryValue;
      shareSupply: MonetaryValue;
    };
    fees: {
      performance: Fee;
      management: Fee;
      network: Fee;
    };
    returnMetrics: ReturnMetrics;
  };
  allocation: {
    assetName: string;
    assetSymbol: string;
    type: string;
    market: string;
    balance: number;
    price: number;
    priceChangeLast24Hours: number;
    value: number;
  }[];
  activity: {
    timestamp: Date;
    market: string;
    assetSymbol: string;
    assetName: string;
    amount: number;
    price: number;
    type: string;
    transactionHash: string;
    user: string;
  }[];
}

// Example vault data for development and testing
export const fakeVaultData: VaultData = {
  overview: {
    id: '0x0000000000000000000000000000000000000000',
    name: 'Resolv USDC Vault',
    description:
      "The Resolv USDC Vault curated by Steakhouse Financial is designed to optimize risk-adjusted returns by lending USDC to Resolv collateral markets, ensuring robust risk management and sustainable yield strategies. The vault employs a sophisticated lending strategy that carefully evaluates borrower creditworthiness, collateral quality, and market conditions. The strategy is actively managed by Steakhouse Financial's experienced team, who continuously monitor market conditions and adjust positions to capture optimal yields while maintaining strong risk controls.",
    sharePrice: 34.12,
    shareCurrency: 'USDC',
    curator: 'Steakhouse Financial',
    roles: {
      owner: '0x6d01a9e00733a6309cc53051b101cda3348568e9',
      manager: '0x6d01a9e00733a6309cc53051b101cda3348568e9',
      guardian: '0x6d01a9e00733a6309cc53051b101cda3348568e9',
    },
  },
  financials: {
    basics: {
      grossAssetValue: {
        value: 3517962.23,
        currency: 'USDC',
      },
      netAssetValue: {
        value: 3517962.23,
        currency: 'USDC',
      },
      shareSupply: {
        value: 824531,
        currency: 'Resolv USDC',
      },
    },
    fees: {
      performance: {
        percentage: 0.0025,
        recipient: '0x6d01a9e00733a6309cc53051b101cda3348568e9',
      },
      management: {
        percentage: 0.0005,
        recipient: '0x6d01a9e00733a6309cc53051b101cda3348520e2',
      },
      network: {
        percentage: 0.0005,
        recipient: '0x6d01a9e00733a6309cc53051b101cda3348545e1',
      },
    },
    returnMetrics: {
      monthToDate: 0.0045,
      quarterToDate: 0.0123,
      yearToDate: 0.0242,
      inceptionToDate: 0.0692,
      averageMonth: 0.0145,
      bestMonth: 0.1592,
      worstMonth: -0.1237,
      trackRecord: 45,
    },
  },
  allocation: [
    {
      assetSymbol: 'USDC',
      assetName: 'FLOW USDC',
      type: 'Spot (Long)',
      market: 'FLOW',
      balance: 3517962.23,
      price: 1.0002,
      priceChangeLast24Hours: 0.0319,
      value: 3517962.23,
    },
    {
      assetSymbol: 'USDT',
      assetName: 'FLOW USDT',
      type: 'Spot (Long)',
      market: 'FLOW',
      balance: 3517962.23,
      price: 1,
      priceChangeLast24Hours: -0.0032,
      value: 3517962.23,
    },
  ],
  activity: [
    {
      timestamp: new Date(2023, 4, 15, 14, 30, 0),
      market: 'FLOW',
      assetSymbol: 'USDT',
      assetName: 'FLOW USDT',
      amount: 1000,
      price: 1,
      type: 'Deposit',
      transactionHash: '0x1234567890abcdef',
      user: '0x6d01a9e00733a6309cc53051b101cda3348568e9',
    },
    {
      timestamp: new Date(2023, 5, 20, 9, 15, 0),
      market: 'Ethereum',
      assetSymbol: 'ETH',
      assetName: 'Ethereum',
      amount: 0.5,
      price: 3200,
      type: 'Withdrawal',
      transactionHash: '0x2a7bc9d45e8f1c6ab3d9e77c',
      user: '0x8f42b334d1c11ba89c752e4d3cd309b0f641d7c8',
    },
    {
      timestamp: new Date(2023, 6, 5, 11, 45, 0),
      market: 'Arbitrum',
      assetSymbol: 'ARB',
      assetName: 'Arbitrum',
      amount: 250,
      price: 1.25,
      type: 'Swap',
      transactionHash: '0x3e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f',
      user: '0x4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b',
    },
    {
      timestamp: new Date(2023, 7, 12, 16, 20, 0),
      market: 'Polygon',
      assetSymbol: 'MATIC',
      assetName: 'Polygon',
      amount: 1500,
      price: 0.85,
      type: 'Yield Harvest',
      transactionHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      user: '0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d',
    },
    {
      timestamp: new Date(2023, 8, 28, 13, 10, 0),
      market: 'Optimism',
      assetSymbol: 'OP',
      assetName: 'Optimism',
      amount: 100,
      price: 2.45,
      type: 'Leverage Adjustment',
      transactionHash: '0x5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e',
      user: '0xe1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0',
    },
    {
      timestamp: new Date(2023, 9, 3, 10, 5, 0),
      market: 'Avalanche',
      assetSymbol: 'AVAX',
      assetName: 'Avalanche',
      amount: 10,
      price: 28.75,
      type: 'Liquidation',
      transactionHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      user: '0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9',
    },
  ],
};

// Define the tabs for your vault page
export type VaultTab = 'overview' | 'financials' | 'allocations' | 'activity' | 'manage';

// Define the context data structure
export interface VaultContextData {
  vault: VaultData | null;
  selectedTab: VaultTab;
  setSelectedTab: (tab: VaultTab) => void;
  isLoading: boolean;
  error: string | null;
  refreshVault: () => Promise<void>;
}

/**
 * Formats a numeric value as a string with commas
 * @param value Numeric value to format
 * @returns Formatted string with commas
 */
export function formatNumberWithCommas(value: number): string {
  return value.toLocaleString();
}

/**
 * Formats a percentage value for display
 * @param value Percentage value (e.g., 0.25 for 0.25%)
 * @param includeSign Whether to include a + sign for positive values
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, includeSign = false): string {
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Formats a monetary value for display
 * @param value The monetary value object
 * @returns Formatted currency string
 */
export function formatMonetaryValue(value: MonetaryValue): string {
  return `${formatNumberWithCommas(value.value)} ${value.currency}`;
}

/**
 * Formats a monetary value as USD
 * @param value The numeric value
 * @returns Formatted USD string
 */
export function formatUSD(value: number): string {
  return `$${formatNumberWithCommas(value)}`;
}

// ==================== CONTEXT AND PROVIDER ====================

// Create the context
const VaultContext = createContext<VaultContextData | undefined>(undefined);

// Create the provider component
export const VaultProvider = ({
  children,
  initialVaultId,
}: {
  children: ReactNode;
  initialVaultId?: string;
}): JSX.Element => {
  const router = useRouter();
  const { selectedTab: tabFromUrl } = router.query;

  // State for the vault data
  const [vault, setVault] = useState<VaultData | null>(fakeVaultData);
  const [selectedTab, setSelectedTab] = useState<VaultTab>((tabFromUrl as VaultTab) || 'overview');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Update URL when tab changes
  const handleTabChange = (tab: VaultTab) => {
    setSelectedTab(tab);
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, selectedTab: tab },
      },
      undefined,
      { shallow: true }
    );
  };

  // Sync with URL parameters
  useEffect(() => {
    if (tabFromUrl && typeof tabFromUrl === 'string') {
      setSelectedTab(tabFromUrl as VaultTab);
    }
  }, [tabFromUrl]);

  // Function to fetch vault data
  const fetchVaultDataAndUpdateState = async (vaultId: string) => {
    console.log('fetchVaultDataAndUpdateState', vaultId);
    setError(null);
  };

  // Load initial data if ID is provided
  useEffect(() => {
    if (initialVaultId) {
      setIsLoading(true);
      fetchVaultDataAndUpdateState(initialVaultId);
      setVault(fakeVaultData);
      setIsLoading(false);
    }
  }, [initialVaultId]);

  // Function to refresh vault data
  const refreshVault = async () => {
    if (vault?.overview?.id) {
      await fetchVaultDataAndUpdateState(vault.overview.id);
    }
  };

  // Create the context value
  const contextValue: VaultContextData = {
    vault,
    selectedTab,
    setSelectedTab: handleTabChange,
    isLoading,
    error,
    refreshVault,
  };

  return <VaultContext.Provider value={contextValue}>{children}</VaultContext.Provider>;
};

// Create the hook to use the context
export const useVaultInfo = (): VaultContextData => {
  const context = useContext(VaultContext);

  if (context === undefined) {
    throw new Error('useVaultInfo must be used within a VaultProvider');
  }

  return context;
};
