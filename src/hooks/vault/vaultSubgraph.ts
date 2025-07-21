import { vaultsConfig } from "src/modules/vault-detail/VaultManagement/facets/vaultsConfig";

// Subgraph related types and functions
export interface VaultSnapshotData {
  id: string;
  timestamp: string;
  hourTimestamp: string;
  totalSupply: string;
  totalAssets: string;
  apy: string;
  return1D: string;
  return7D: string;
  return30D: string;
  return180D: string;
  return360D: string;
  vault: {
    id: string;
    symbol: string;
  };
}

export interface VaultData {
  apyCalculatedLast360Days: string;
  totalSupply: string;
  totalAssets: string;
  creationTimestamp: string;
}

const fetchSubgraphData = async <T>(
  chainId: number,
  query: string,
  variables?: Record<string, string>
): Promise<T | null> => {
  const config = vaultsConfig[chainId];
  if (!config || !config.subgraphUrl) {
    console.warn(`Subgraph URL not configured for chainId: ${chainId}`);
    return null;
  }

  try {
    const response = await fetch(config.subgraphUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Subgraph request failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    if (result.errors) {
      console.error('Subgraph query errors:', result.errors);
      // Optionally, you could throw an error that includes messages from result.errors
      return null; // Or handle errors more gracefully depending on use case
    }
    return result.data;
  } catch (error) {
    console.error('Error fetching subgraph data:', error);
    return null;
  }
};

interface VaultQueryResponse {
  vaults: VaultData[];
}

const GET_VAULT_QUERY = `
  query GetVault($vaultId: String!) {
    vaults(
      where: { id: $vaultId }
    ) {
      apyCalculatedLast360Days
      totalSupply
      totalAssets
      creationTimestamp
    }
  }
`;

export const fetchVaultData = async (
  chainId: number,
  vaultId: string
): Promise<VaultData | null> => {
  if (!vaultId) return null;
  const data = await fetchSubgraphData<VaultQueryResponse>(
    chainId,
    GET_VAULT_QUERY,
    { vaultId: vaultId.toLowerCase() }
  );
  if (data && data.vaults && data.vaults.length > 0) {
    return data.vaults[0];
  }
  return null;
};

// New query for historical data
const GET_VAULT_HISTORICAL_SNAPSHOTS_QUERY = `
  query GetVaultHistoricalSnapshots($vaultId: String!) {
    vaultDailySnapshots(
      where: { vault: $vaultId }
      orderBy: timestamp
      orderDirection: desc 
      first: 1000
    ) {
      timestamp
      totalSupply
      apy
    }
  }
`;

interface HistoricalSnapshotEntry {
  timestamp: string;
  apy: string;
  totalSupply: string;
}

interface HistoricalSnapshotsQueryResponse {
  vaultDailySnapshots: HistoricalSnapshotEntry[];
}

/**
 * Fetches all historical vault snapshots for a given vault.
 * These snapshots contain hourly data for APY, total supply, etc.
 */
export const fetchVaultHistoricalSnapshots = async (
  chainId: number,
  vaultId: string
): Promise<HistoricalSnapshotEntry[] | null> => {
  if (!vaultId) return null;
  const data = await fetchSubgraphData<HistoricalSnapshotsQueryResponse>(
    chainId,
    GET_VAULT_HISTORICAL_SNAPSHOTS_QUERY,
    { vaultId: vaultId.toLowerCase() }
  );
  // Ensure data and data.vaultSnapshots are not null before returning
  return data?.vaultDailySnapshots || null;
};

/**
 * Formats an array of historical vault snapshots for use in charts.
 * @param snapshots Array of historical snapshot data.
 * @param dataKey The key to extract for the 'value' field (e.g., 'apy' or 'totalSupply').
 * @returns An array of objects with 'time' and 'value' properties.
 */
export const formatSnapshotsForChart = (
  snapshots: HistoricalSnapshotEntry[] | null,
  dataKey: 'apy' | 'totalSupply'
): Array<{ time: string; value: number }> => {
  if (!snapshots) {
    return [];
  }

  return snapshots.map((snapshot) => {
    const date = new Date(parseInt(snapshot.timestamp, 10) * 1000);

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // const timeString = `${year}-${month}-${day} ${hours}:${minutes}`;
    const timeString = `${year}-${month}-${day}`;

    const rawValue = snapshot[dataKey];
    // Handle potential GQL scientific notation for large numbers if APY can be very small or totalSupply very large
    let numericValue = parseFloat(rawValue);

    // If APY is a percentage decimal (0.05 for 5%), multiply by 100 to get percentage
    if (dataKey === 'apy') {
      numericValue = numericValue * 100;
    }
    // If total supply comes in as base units (e.g. wei for ETH), it might need formatting
    // For total supply, we keep the raw numeric value for now

    return {
      time: timeString,
      value: isNaN(numericValue) ? 0 : numericValue, // Default to 0 if parsing fails
    };
  }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()); // Ensure sorted by time
};