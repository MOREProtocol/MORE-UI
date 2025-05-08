import { vaultsConfig } from "src/modules/vault-detail/VaultManagement/facets/vaultsConfig";

// Subgraph related types and functions
export interface VaultSnapshotData {
  id: string;
  timestamp: string;
  hourTimestamp: string;
  totalSupply: string;
  totalAssets: string;
  apy: string;
  vault: {
    id: string;
    symbol: string;
  };
}

const fetchSubgraphData = async <T>(
  chainId: number,
  query: string,
  variables?: Record<string, any>
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

interface VaultSnapshotsQueryResponse {
  vaultSnapshots: VaultSnapshotData[];
}

const GET_VAULT_SNAPSHOTS_QUERY = `
  query GetVaultSnapshots($vaultId: String!) {
    vaultSnapshots(
      where: { vault: $vaultId }
      orderBy: hourTimestamp
      orderDirection: desc
      limit: 1
    ) {
      id
      timestamp
      hourTimestamp
      totalSupply
      totalAssets
      apy
      vault {
        id
        symbol
      }
    }
  }
`;

export const fetchLatestVaultSnapshot = async (
  chainId: number,
  vaultId: string
): Promise<VaultSnapshotData | null> => {
  if (!vaultId) return null;
  const data = await fetchSubgraphData<VaultSnapshotsQueryResponse>(
    chainId,
    GET_VAULT_SNAPSHOTS_QUERY,
    { vaultId: vaultId.toLowerCase() }
  );
  if (data && data.vaultSnapshots && data.vaultSnapshots.length > 0) {
    return data.vaultSnapshots[0];
  }
  return null;
};

// New query for historical data
const GET_VAULT_HISTORICAL_SNAPSHOTS_QUERY = `
  query GetVaultHistoricalSnapshots($vaultId: String!) {
    vaultHourlySnapshots(
      where: { vault: $vaultId }
      orderBy: hourTimestamp
      orderDirection: desc 
    ) {
      hourTimestamp
      apy
      totalSupply
    }
  }
`;

interface HistoricalSnapshotEntry {
  hourTimestamp: string;
  apy: string;
  totalSupply: string;
}

interface HistoricalSnapshotsQueryResponse {
  vaultHourlySnapshots: HistoricalSnapshotEntry[];
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
  return data?.vaultHourlySnapshots || null;
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
    const date = new Date(parseInt(snapshot.hourTimestamp, 10) * 1000);

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    const timeString = `${year}-${month}-${day} ${hours}:${minutes}`;

    let rawValue = snapshot[dataKey];
    // Handle potential GQL scientific notation for large numbers if APY can be very small or totalSupply very large
    let numericValue = parseFloat(rawValue);

    // If APY is a percentage, like "0.05" for 5%, you might need to multiply by 100
    // Assuming APY from subgraph is already in a direct percentage form (e.g., 5 for 5%)
    // or a direct decimal (e.g. 0.05 for 5%)
    // If total supply comes in as base units (e.g. wei for ETH), it might need formatting (e.g. to ETH)
    // For now, a direct parse is done.

    return {
      time: timeString,
      value: isNaN(numericValue) ? 0 : numericValue, // Default to 0 if parsing fails
    };
  }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()); // Ensure sorted by time
};