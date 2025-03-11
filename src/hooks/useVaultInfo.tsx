import React, { createContext, JSX, ReactNode, useContext, useState } from 'react';

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
}

// Define a type for the raw API response
export interface RawVaultApiResponse {
  id?: string;
  name?: string;
  description?: string;
  sharePrice?: string;
  shareCurrency?: string;
  curator?: string;
  owner?: string;
  manager?: string;
  guardian?: string;
  grossAssetValue?: {
    formatted?: string;
    currency?: string;
  };
  netAssetValue?: {
    formatted?: string;
    currency?: string;
  };
  shareSupply?: {
    formatted?: string;
    currency?: string;
  };
  fees?: {
    performance?: {
      formatted?: string;
      recipient?: string;
    };
    management?: {
      formatted?: string;
      recipient?: string;
    };
    network?: {
      formatted?: string;
      recipient?: string;
    };
  };
  returns?: {
    mtd?: string;
    qtd?: string;
    ytd?: string;
    itd?: string;
    avgMonth?: string;
    bestMonth?: string;
    worstMonth?: string;
    trackRecord?: string;
  };
}

// Define a type for external API data structure
export interface ExternalVaultApiData {
  vault_id: string;
  vault_name: string;
  vault_symbol?: string;
  description?: string;
  price_per_share?: string;
  curator_name?: string;
  roles?: {
    owner_address?: string;
    manager_address?: string;
    guardian_address?: string;
  };
  gav_formatted?: string;
  gav_usd?: string;
  gav_raw?: string;
  nav_formatted?: string;
  nav_usd?: string;
  nav_raw?: string;
  shares_formatted?: string;
  shares_raw?: string;
  base_currency?: string;
  performance_fee?: number;
  management_fee?: number;
  network_fee?: number;
  fee_recipient?: string;
  network_fee_recipient?: string;
  returns?: {
    mtd?: number;
    qtd?: number;
    ytd?: number;
    itd?: number;
    avg_month?: number;
    best_month?: number;
    worst_month?: number;
    track_record_months?: number;
  };
}

// Example vault data for development and testing
export const fakeVaultData: VaultData = {
  overview: {
    id: '0x0000000000000000000000000000000000000000',
    name: 'Resolv USDC Vault',
    description:
      'The Resolv USDC Vault curated by Steakhouse Financial is designed to optimize risk-adjusted returns by lending USDC to Resolv collateral markets, ensuring robust risk management and sustainable yield strategies.',
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
        percentage: 0.25,
        recipient: '0x6d01a9e00733a6309cc53051b101cda3348568e9',
      },
      management: {
        percentage: 0.01,
        recipient: '0x6d01a9e00733a6309cc53051b101cda3348520e2',
      },
      network: {
        percentage: 0.05,
        recipient: '0x6d01a9e00733a6309cc53051b101cda3348545e1',
      },
    },
    returnMetrics: {
      monthToDate: 0.45,
      quarterToDate: 1.23,
      yearToDate: 2.42,
      inceptionToDate: 6.92,
      averageMonth: 1.45,
      bestMonth: 15.92,
      worstMonth: -12.37,
      trackRecord: 45,
    },
  },
};

// Define the tabs for your vault page
export type VaultTab = 'overview' | 'financials' | 'allocations' | 'activity';

// Define the context data structure
export interface VaultContextData {
  vault: VaultData | null;
  selectedTab: VaultTab;
  setSelectedTab: (tab: VaultTab) => void;
  isLoading: boolean;
  error: string | null;
  refreshVault: () => Promise<void>;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Transforms raw API response data into our standardized VaultData format
 * @param apiData Raw data from the API
 * @returns Standardized VaultData object
 */
export function transformApiDataToVaultData(apiData: RawVaultApiResponse): VaultData {
  return {
    overview: {
      id: apiData.id || '',
      name: apiData.name || '',
      description: apiData.description || '',
      sharePrice: parseFloat(apiData.sharePrice || '0'),
      shareCurrency: apiData.curator || 'USDC',
      curator: apiData.curator || '',
      roles: {
        owner: apiData.owner || '',
        manager: apiData.manager || '',
        guardian: apiData.guardian || '',
      },
    },
    financials: {
      basics: {
        grossAssetValue: {
          value: parseFloat(apiData.grossAssetValue?.formatted || '0'),
          currency: apiData.grossAssetValue?.currency || 'USDC',
        },
        netAssetValue: {
          value: parseFloat(apiData.netAssetValue?.formatted || '0'),
          currency: apiData.netAssetValue?.currency || 'USDC',
        },
        shareSupply: {
          value: parseFloat(apiData.shareSupply?.formatted || '0'),
          currency: apiData.shareSupply?.currency || 'USDC',
        },
      },
      fees: {
        performance: {
          percentage: parseFloat(apiData.fees?.performance?.formatted || '0'),
          recipient: apiData.fees?.performance?.recipient || '',
        },
        management: {
          percentage: parseFloat(apiData.fees?.management?.formatted || '0'),
          recipient: apiData.fees?.management?.recipient || '',
        },
        network: {
          percentage: parseFloat(apiData.fees?.network?.formatted || '0'),
          recipient: apiData.fees?.network?.recipient || '',
        },
      },
      returnMetrics: {
        monthToDate: parseFloat(apiData.returns?.mtd || '0'),
        quarterToDate: parseFloat(apiData.returns?.qtd || '0'),
        yearToDate: parseFloat(apiData.returns?.ytd || '0'),
        inceptionToDate: parseFloat(apiData.returns?.itd || '0'),
        averageMonth: parseFloat(apiData.returns?.avgMonth || '0'),
        bestMonth: parseFloat(apiData.returns?.bestMonth || '0'),
        worstMonth: parseFloat(apiData.returns?.worstMonth || '0'),
        trackRecord: parseFloat(apiData.returns?.trackRecord || '0'),
      },
    },
  };
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

// ==================== API FUNCTIONS ====================

/**
 * Fetches vault data from the API
 * @param vaultId The ID of the vault to fetch
 * @returns Promise resolving to the standardized VaultData
 */
export async function fetchVaultData(vaultId: string): Promise<VaultData> {
  try {
    // Make the API request
    const response = await fetch(`/api/vaults/${vaultId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch vault data: ${response.statusText}`);
    }

    // Parse the raw API response
    const rawData: RawVaultApiResponse = await response.json();

    // Transform the raw data to our standardized format
    return transformApiDataToVaultData(rawData);
  } catch (error) {
    console.error('Error fetching vault data:', error);
    throw error;
  }
}

/**
 * Fetches all vaults from the API
 * @returns Promise resolving to an array of standardized VaultData
 */
export async function fetchAllVaults(): Promise<VaultData[]> {
  try {
    // Make the API request
    const response = await fetch('/api/vaults');

    if (!response.ok) {
      throw new Error(`Failed to fetch vaults: ${response.statusText}`);
    }

    // Parse the raw API response
    const rawDataArray: RawVaultApiResponse[] = await response.json();

    // Transform each item in the array to our standardized format
    return rawDataArray.map(transformApiDataToVaultData);
  } catch (error) {
    console.error('Error fetching all vaults:', error);
    throw error;
  }
}

/**
 * Example of how to adapt a different API format to our standardized format
 * @param externalApiData Data from an external API with a different structure
 * @returns Standardized VaultData
 */
export function adaptExternalApiData(externalApiData: ExternalVaultApiData): RawVaultApiResponse {
  // This is just an example - adjust according to the actual external API structure
  return {
    id: externalApiData.vault_id,
    name: externalApiData.vault_name,
    description: externalApiData.description,
    sharePrice: externalApiData.price_per_share,
    shareCurrency: externalApiData.base_currency,
    curator: externalApiData.curator_name,
    owner: externalApiData.roles?.owner_address,
    manager: externalApiData.roles?.manager_address,
    guardian: externalApiData.roles?.guardian_address,
    grossAssetValue: {
      formatted: externalApiData.gav_formatted,
      currency: externalApiData.base_currency,
    },
    netAssetValue: {
      formatted: externalApiData.nav_formatted,
      currency: externalApiData.base_currency,
    },
    shareSupply: {
      formatted: externalApiData.shares_formatted,
      currency: externalApiData.vault_symbol,
    },
    fees: {
      performance: {
        formatted: externalApiData.performance_fee?.toString(),
        recipient: externalApiData.fee_recipient,
      },
      management: {
        formatted: externalApiData.management_fee?.toString(),
        recipient: externalApiData.fee_recipient,
      },
      network: {
        formatted: externalApiData.network_fee?.toString(),
        recipient: externalApiData.network_fee_recipient,
      },
    },
    returns: {
      mtd: externalApiData.returns?.mtd?.toString(),
      qtd: externalApiData.returns?.qtd?.toString(),
      ytd: externalApiData.returns?.ytd?.toString(),
      itd: externalApiData.returns?.itd?.toString(),
      avgMonth: externalApiData.returns?.avg_month?.toString(),
      bestMonth: externalApiData.returns?.best_month?.toString(),
      worstMonth: externalApiData.returns?.worst_month?.toString(),
      trackRecord: externalApiData.returns?.track_record_months?.toString(),
    },
  };
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
  // State for the vault data
  const [vault, setVault] = useState<VaultData | null>(fakeVaultData);
  const [selectedTab, setSelectedTab] = useState<VaultTab>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch vault data
  const fetchVaultDataAndUpdateState = async (vaultId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use our API function to fetch and transform the data
      const transformedData = await fetchVaultData(vaultId);
      setVault(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching vault data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data if ID is provided
  React.useEffect(() => {
    if (initialVaultId) {
      fetchVaultDataAndUpdateState(initialVaultId);
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
    setSelectedTab,
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
