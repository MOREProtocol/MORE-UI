import { vaultsConfig } from "src/modules/vault-detail/VaultManagement/facets/vaultsConfig";

export interface VaultData {
  apyDailyReturnLast1Day: string;
  apyDailyReturnLast7Days: string;
  apyDailyReturnLast30Days: string;
  apyDailyReturnLast365Days: string;
  apyWeeklyReturnLast1Week: string;
  apyWeeklyReturnLast4Weeks: string;
  apyWeeklyReturnLast26Weeks: string;
  apyWeeklyReturnLast52Weeks: string;
  totalSupply: string;
  totalAssets: string;
  creationTimestamp: string;
}

// PnL related types
export interface UserVaultBalance {
  user: string;
  vault: { id: string };
  sharesBalance: string;
  shareBalanceUSD: string;
  totalDeposited: string;
  totalDepositedUSD: string;
  totalWithdrawn: string;
  totalWithdrawnUSD: string;
  weightedAverageCostBasis: string;
  realizedPnL: string;
  realizedPnLUSD: string;
  unrealizedPnL: string;
  unrealizedPnLUSD: string;
  lastPnLUpdateTimestamp: string;
  lastUpdatedTimestamp: string;
}

export interface UserVaultTransaction {
  user: string;
  vault: { id: string };
  timestamp: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  assetAmount: string;
  assetAmountUSD: string;
  sharesAmount: string;
  sharesAmountUSD: string;
  sharesBalanceAfter: string;
  sharesBalanceAfterUSD: string;
  sharePriceAtTransaction: string;
  assetPriceUSDAtTransaction: string;
}

const fetchSubgraphData = async <T>(
  chainId: number,
  query: string,
  variables?: Record<string, unknown>,
  overrideUrl?: string
): Promise<T | null> => {
  const config = vaultsConfig[chainId];
  const targetUrl = overrideUrl || config?.subgraphUrl;
  if (!targetUrl) {
    console.warn(`Subgraph URL not configured for chainId: ${chainId}`);
    return null;
  }

  try {
    const response = await fetch(targetUrl, {
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
      totalSupply
      totalAssets
      creationTimestamp
      apyDailyReturnLast1Day
      apyDailyReturnLast7Days
      apyDailyReturnLast30Days
      apyDailyReturnLast365Days
      apyWeeklyReturnLast1Week
      apyWeeklyReturnLast4Weeks
      apyWeeklyReturnLast26Weeks
      apyWeeklyReturnLast52Weeks
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

// PnL related queries and response types
interface UserVaultBalancesQueryResponse {
  userVaultBalances: UserVaultBalance[];
}

interface UserVaultTransactionsQueryResponse {
  userVaultTransactions: UserVaultTransaction[];
}

interface VaultDailySnapshot {
  timestamp: string;
  vault: { id: string };
  sharePrice: string;
  sharePriceUSD?: string;
  totalAssets: string;
  totalSupply: string;
  apyDailyProjected: string;
  apyDailyReturnTrailing: string;
  apyWeeklyReturnTrailing: string;
  apyPriceTrailing: string;
}

// Vault asset USD price entity
interface VaultAssetPriceEntity {
  id: string; // asset address as id
  asset: string; // asset address
  priceInUsd: string; // 8 decimals
  lastUpdateTimestamp: string;
}

interface VaultAssetPricesQueryResponse {
  vaultAssetPrices: VaultAssetPriceEntity[];
}

const GET_VAULT_ASSET_PRICES_QUERY = `
  query GetVaultAssetPrices($assetIds: [String!]) {
    vaultAssetPrices(where: { id_in: $assetIds }) {
      id
      asset
      priceInUsd
      lastUpdateTimestamp
    }
  }
`;

export const fetchVaultAssetPrices = async (
  chainId: number,
  assetAddresses: string[]
): Promise<Map<string, number>> => {
  const clean = Array.from(new Set((assetAddresses || []).filter(Boolean).map((a) => a.toLowerCase())));
  if (!clean.length) return new Map();
  const data = await fetchSubgraphData<VaultAssetPricesQueryResponse>(
    chainId,
    GET_VAULT_ASSET_PRICES_QUERY,
    { assetIds: clean }
  );
  const map = new Map<string, number>();
  (data?.vaultAssetPrices || []).forEach((p) => {
    const addr = (p.id || p.asset || '').toLowerCase();
    const usd = Number(p.priceInUsd) / 1e8;
    if (addr) map.set(addr, Number.isFinite(usd) ? usd : 0);
  });
  return map;
};

interface VaultDailySnapshotsQueryResponse {
  vaultDailySnapshots: VaultDailySnapshot[];
}

const GET_USER_VAULT_BALANCES_QUERY = `
  query GetUserVaultBalances($userAddress: String!) {
    userVaultBalances(where: { user: $userAddress }) {
      user
      vault { id }
      sharesBalance
      shareBalanceUSD
      totalDeposited
      totalDepositedUSD
      totalWithdrawn
      totalWithdrawnUSD
      weightedAverageCostBasis
      realizedPnL
      realizedPnLUSD
      unrealizedPnL
      unrealizedPnLUSD
      lastPnLUpdateTimestamp
      lastUpdatedTimestamp
    }
  }
`;

const GET_USER_VAULT_TRANSACTIONS_QUERY = `
  query GetUserVaultTransactions($userAddress: String!, $vaultIds: [String!]) {
    userVaultTransactions(
      where: { 
        user: $userAddress
        vault_in: $vaultIds
      }
      orderBy: timestamp
      orderDirection: desc
      first: 1000
    ) {
      user
      vault { id }
      timestamp
      type
      assetAmount
      assetAmountUSD
      sharesAmount
      sharesAmountUSD
      sharesBalanceAfter
      sharesBalanceAfterUSD
      sharePriceAtTransaction
      assetPriceUSDAtTransaction
    }
  }
`;

const GET_ALL_USER_VAULT_TRANSACTIONS_QUERY = `
  query GetAllUserVaultTransactions($userAddress: String!) {
    userVaultTransactions(
      where: { user: $userAddress }
      orderBy: timestamp
      orderDirection: desc
      first: 1000
    ) {
      user
      vault { id }
      timestamp
      type
      assetAmount
      assetAmountUSD
      sharesAmount
      sharesAmountUSD
      sharesBalanceAfter
      sharesBalanceAfterUSD
      sharePriceAtTransaction
      assetPriceUSDAtTransaction
    }
  }
`;

const GET_VAULT_DAILY_SNAPSHOTS_FOR_USER_QUERY = `
  query GetVaultDailySnapshotsForUser($vaultIds: [String!]!, $fromTimestamp: String!, $first: Int!, $skip: Int!) {
    vaultDailySnapshots(
      where: { 
        vault_in: $vaultIds,
        timestamp_gte: $fromTimestamp
      }
      orderBy: timestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      timestamp
      vault { id }
      sharePrice
      sharePriceUSD
      totalAssets
      totalSupply
      apyDailyProjected
      apyDailyReturnTrailing
      apyWeeklyReturnTrailing
      apyPriceTrailing
    }
  }
`;

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
      totalAssets
      sharePrice
      sharePriceUSD
      apyDailyProjected
      apyDailyReturnTrailing
      apyWeeklyReturnTrailing
      apyPriceTrailing
    }
  }
`;

const GET_VAULT_HISTORICAL_SNAPSHOTS_SINCE_QUERY = `
  query GetVaultHistoricalSnapshotsSince($vaultId: String!, $fromTimestamp: String!) {
    vaultDailySnapshots(
      where: { vault: $vaultId, timestamp_gte: $fromTimestamp }
      orderBy: timestamp
      orderDirection: desc
      first: 1000
    ) {
      timestamp
      totalSupply
      totalAssets
      sharePrice
      sharePriceUSD
      apyDailyProjected
      apyDailyReturnTrailing
      apyWeeklyReturnTrailing
      apyPriceTrailing
    }
  }
`;

interface HistoricalSnapshotEntry {
  timestamp: string;
  apyDailyProjected: string;
  apyDailyReturnTrailing: string;
  apyWeeklyReturnTrailing: string;
  apyPriceTrailing: string;
  totalSupply: string;
  sharePrice: string;
  sharePriceUSD?: string;
  totalAssets: string;
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
  vaultId: string,
  fromTimestamp?: number
): Promise<HistoricalSnapshotEntry[] | null> => {
  if (!vaultId) return null;
  const useSince = typeof fromTimestamp === 'number' && fromTimestamp > 0;
  const query = useSince ? GET_VAULT_HISTORICAL_SNAPSHOTS_SINCE_QUERY : GET_VAULT_HISTORICAL_SNAPSHOTS_QUERY;
  const variables: Record<string, string> = { vaultId: vaultId.toLowerCase() };
  if (useSince) variables.fromTimestamp = String(fromTimestamp);
  const data = await fetchSubgraphData<HistoricalSnapshotsQueryResponse>(
    chainId,
    query,
    variables,
    vaultsConfig[chainId]?.chartUrl
  );
  return data?.vaultDailySnapshots || null;
};

/**
 * Formats an array of historical vault snapshots for use in charts.
 * @param snapshots Array of historical snapshot data.
 * @param dataKey The key to extract for the 'value' field (e.g., 'apy', 'totalSupply').
 * @returns An array of objects with 'time' and 'value' properties.
 */
export const formatSnapshotsForChart = (
  snapshots: HistoricalSnapshotEntry[] | null,
  dataKey: 'apyWeeklyReturnTrailing' | 'totalSupply' | 'totalAssets' | 'sharePrice'
): Array<{ time: string; value: number }> => {
  if (!snapshots) {
    return [];
  }

  const processedData = snapshots
    .map((snapshot) => {
      // Check if the required dataKey exists in this snapshot
      if (!(dataKey in snapshot) || snapshot[dataKey] === undefined || snapshot[dataKey] === null) {
        console.warn(`Missing or null ${dataKey} in snapshot:`, snapshot);
        return null;
      }

      // Use the original timestamp to preserve precision
      const timestamp = parseInt(snapshot.timestamp, 10);

      // Validate the timestamp
      if (isNaN(timestamp)) {
        console.warn(`Invalid timestamp in snapshot:`, snapshot.timestamp);
        return null;
      }

      // Convert to ISO string for consistent parsing in the chart component
      const date = new Date(timestamp * 1000);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date from timestamp:`, timestamp);
        return null;
      }

      // Use ISO string to preserve exact timestamp
      const timeString = date.toISOString();

      const rawValue = snapshot[dataKey];
      let numericValue = parseFloat(rawValue as string);

      // Handle NaN values
      if (isNaN(numericValue)) {
        console.warn(`Invalid numeric value for ${dataKey}:`, rawValue);
        return null;
      }

      // Apply transformations based on data type
      if (dataKey === 'apyWeeklyReturnTrailing') {
        // If APY/APR is a percentage decimal (0.05 for 5%), multiply by 100 to get percentage
        numericValue = numericValue * 100;
      }
      // For totalSupply, totalAssets and sharePrice, keep the raw numeric value

      return {
        time: timeString,
        value: numericValue,
      };
    })
    .filter(Boolean) // Remove null entries
    .sort((a, b) => new Date(a!.time).getTime() - new Date(b!.time).getTime()); // Ensure sorted by time

  // Only filter the latest data point for APY and APR (incomplete daily calculations)
  // Keep all data points for totalSupply and sharePrice (always accurate)
  if ((dataKey === 'apyWeeklyReturnTrailing') && processedData.length > 1) {
    processedData.pop();
  }

  return processedData;
};

// PnL fetch functions
export const fetchUserVaultBalances = async (
  chainId: number,
  userAddress: string
): Promise<UserVaultBalance[] | null> => {
  if (!userAddress) return null;
  const data = await fetchSubgraphData<UserVaultBalancesQueryResponse>(
    chainId,
    GET_USER_VAULT_BALANCES_QUERY,
    { userAddress: userAddress.toLowerCase() }
  );
  return data?.userVaultBalances || null;
};

export const fetchUserVaultTransactions = async (
  chainId: number,
  userAddress: string,
  vaultIds?: string[]
): Promise<UserVaultTransaction[] | null> => {
  if (!userAddress) return null;

  // Use specific vault query if vaultIds provided, otherwise get all user transactions
  const query = vaultIds && vaultIds.length > 0
    ? GET_USER_VAULT_TRANSACTIONS_QUERY
    : GET_ALL_USER_VAULT_TRANSACTIONS_QUERY;

  const variables = vaultIds && vaultIds.length > 0
    ? {
      userAddress: userAddress.toLowerCase(),
      vaultIds: vaultIds.map(id => id.toLowerCase())
    }
    : { userAddress: userAddress.toLowerCase() };

  const data = await fetchSubgraphData<UserVaultTransactionsQueryResponse>(
    chainId,
    query,
    variables
  );
  return data?.userVaultTransactions || null;
};

export const fetchVaultDailySnapshots = async (
  chainId: number,
  vaultIds: string[],
  fromTimestamp: number
): Promise<VaultDailySnapshot[] | null> => {
  if (!vaultIds || vaultIds.length === 0) return null;

  const allSnapshots: VaultDailySnapshot[] = [];
  const batchSize = 1000; // Max allowed by subgraph
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    // Try the primary query first
    const data = await fetchSubgraphData<VaultDailySnapshotsQueryResponse>(
      chainId,
      GET_VAULT_DAILY_SNAPSHOTS_FOR_USER_QUERY,
      {
        vaultIds: vaultIds.map(id => id.toLowerCase()),
        fromTimestamp: fromTimestamp.toString(),
        first: batchSize,
        skip: skip
      }
    );

    const batch = data?.vaultDailySnapshots || [];

    if (batch.length === 0) {
      hasMore = false;
    } else {
      allSnapshots.push(...batch);
      skip += batchSize;

      // If we received less than the batch size, we've reached the end
      if (batch.length < batchSize) {
        hasMore = false;
      }
    }

    // Safety check to prevent infinite loops
    if (skip > 50000) { // Max 50 batches = 50k records
      console.warn('⚠️ Reached maximum pagination limit (50k records)');
      hasMore = false;
    }
  }

  return allSnapshots.length > 0 ? allSnapshots : null;
};

// Portfolio metrics calculation utilities
export interface PortfolioMetrics {
  totalRealizedPnLUSD: number;
  totalUnrealizedPnLUSD: number;
  totalBalanceUSD: number;
  dailyPnLEvolution: Array<{ time: string; value: number }>;
  dailyPnLPercentEvolution?: Array<{ time: string; value: number }>;
  dailyAmountEvolution: Array<{ time: string; value: number }>;
  perVaultMetrics: Array<{
    vaultId: string;
    realizedPnLUSD: number;
    unrealizedPnLUSD: number;
    balanceUSD: number;
    totalDepositedUSD: number;
    totalWithdrawnUSD: number;
    // Asset-denominated metrics (optional)
    realizedPnLAsset?: number;
    unrealizedPnLAsset?: number;
    totalPnLAsset?: number;
    investedAsset?: number;
    percentPnLAsset?: number;
  }>;
  // Maximum of userVaultBalances.lastPnLUpdateTimestamp across all balances
  // Expressed as UNIX seconds
  lastUpdatedTimestamp?: number;
  // Time-weighted APY of current positions, weighted by USD balance
  positionsApy?: number;
}

export const calculateTotalRealizedPnL = (balances: UserVaultBalance[]): number => {
  if (!balances) return 0;
  return balances.reduce((total, balance) => {
    return total + parseFloat(balance.realizedPnLUSD || '0');
  }, 0);
};

export const calculateTotalUnrealizedPnL = (balances: UserVaultBalance[]): number => {
  if (!balances) return 0;
  return balances.reduce((total, balance) => {
    return total + parseFloat(balance.unrealizedPnLUSD || '0');
  }, 0);
};

export const calculateTotalBalanceUSD = (balances: UserVaultBalance[]): number => {
  if (!balances) return 0;
  return balances.reduce((total, balance) => {
    return total + parseFloat(balance.shareBalanceUSD || '0');
  }, 0);
};

export const groupMetricsByVault = (balances: UserVaultBalance[]): PortfolioMetrics['perVaultMetrics'] => {
  if (!balances) return [];

  return balances.map(balance => ({
    vaultId: balance.vault.id,
    realizedPnLUSD: parseFloat(balance.realizedPnLUSD || '0'),
    unrealizedPnLUSD: parseFloat(balance.unrealizedPnLUSD || '0'),
    balanceUSD: parseFloat(balance.shareBalanceUSD || '0'),
    totalDepositedUSD: parseFloat(balance.totalDepositedUSD || '0'),
    totalWithdrawnUSD: parseFloat(balance.totalWithdrawnUSD || '0'),
  }));
};

export const processPnLEvolution = (transactions: UserVaultTransaction[]): Array<{ time: string; value: number }> => {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Sort transactions by timestamp (oldest first)
  const sortedTransactions = [...transactions].sort((a, b) =>
    parseInt(a.timestamp) - parseInt(b.timestamp)
  );

  // Group transactions by day and calculate running PnL
  const dailyData = new Map<string, { totalPnL: number; timestamp: number }>();
  let runningRealizedPnL = 0;

  sortedTransactions.forEach(tx => {
    const timestamp = parseInt(tx.timestamp);
    const date = new Date(timestamp * 1000);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Calculate PnL for this transaction
    const transactionAmountUSD = parseFloat(tx.assetAmountUSD || '0');
    const currentValue = parseFloat(tx.sharesBalanceAfterUSD || '0');

    // Handle all transaction types for PnL calculation
    if (tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN') {
      // These increase the user's investment (cost basis), so they reduce net PnL initially
      // DEPOSIT: User deposits assets into vault
      // TRANSFER_IN: Assets transferred into user's vault position from another address
      runningRealizedPnL -= transactionAmountUSD;
    } else if (tx.type === 'WITHDRAW' || tx.type === 'TRANSFER_OUT') {
      // These realize some PnL by reducing the position
      // WITHDRAW: User withdraws assets from vault  
      // TRANSFER_OUT: Assets transferred out of user's vault position to another address
      runningRealizedPnL += transactionAmountUSD;
    }

    // Store the day's ending PnL
    dailyData.set(dayKey, {
      totalPnL: runningRealizedPnL + currentValue,
      timestamp
    });
  });

  // Convert to array format for charts
  return Array.from(dailyData.entries())
    .map(([, data]) => ({
      time: new Date(data.timestamp * 1000).toISOString(),
      value: data.totalPnL
    }))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
};

export const processAmountEvolution = (transactions: UserVaultTransaction[]): Array<{ time: string; value: number }> => {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Sort transactions by timestamp (oldest first)
  const sortedTransactions = [...transactions].sort((a, b) =>
    parseInt(a.timestamp) - parseInt(b.timestamp)
  );

  // Group transactions by day and track total USD value
  const dailyData = new Map<string, { totalValue: number; timestamp: number }>();

  sortedTransactions.forEach(tx => {
    const timestamp = parseInt(tx.timestamp);
    const date = new Date(timestamp * 1000);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    const totalValueAfter = parseFloat(tx.sharesBalanceAfterUSD || '0');

    // Store the day's ending total value
    dailyData.set(dayKey, {
      totalValue: totalValueAfter,
      timestamp
    });
  });

  // Convert to array format for charts
  return Array.from(dailyData.entries())
    .map(([, data]) => ({
      time: new Date(data.timestamp * 1000).toISOString(),
      value: data.totalValue
    }))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
};

// Enhanced transaction-based processing with simple interpolation
export const processAmountEvolutionWithInterpolation = (transactions: UserVaultTransaction[]): Array<{ time: string; value: number }> => {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Get basic transaction-based data
  const transactionData = processAmountEvolution(transactions);

  if (transactionData.length < 2) {
    return transactionData; // Need at least 2 points for interpolation
  }

  // Create daily interpolated data between transaction points
  const interpolatedData: Array<{ time: string; value: number }> = [];

  for (let i = 0; i < transactionData.length; i++) {
    const current = transactionData[i];
    interpolatedData.push(current);

    // Add interpolated points to the next transaction (if exists)
    if (i < transactionData.length - 1) {
      const next = transactionData[i + 1];
      const currentDate = new Date(current.time);
      const nextDate = new Date(next.time);
      const daysDiff = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only interpolate if there are gaps larger than 1 day
      if (daysDiff > 1) {
        const valueStep = (next.value - current.value) / daysDiff;

        for (let day = 1; day < daysDiff; day++) {
          const interpolatedDate = new Date(currentDate);
          interpolatedDate.setDate(interpolatedDate.getDate() + day);
          const interpolatedValue = current.value + (valueStep * day);

          interpolatedData.push({
            time: interpolatedDate.toISOString(),
            value: interpolatedValue
          });
        }
      }
    }
  }

  return interpolatedData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
};

// Enhanced daily position tracking
interface DailyPosition {
  timestamp: number;
  vaultId: string;
  sharesBalance: number;
  totalInvested: number; // Cost basis
  realizedPnL: number;
}

interface DailyPortfolioValue {
  timestamp: number;
  totalValueUSD: number;
  totalInvestedUSD: number;
  unrealizedPnLUSD: number;
  realizedPnLUSD: number;
  totalPnLUSD: number;
}

export const buildDailyPositionHistory = (
  transactions: UserVaultTransaction[]
): Map<string, DailyPosition[]> => {
  if (!transactions || transactions.length === 0) {
    return new Map();
  }

  // Sort transactions by timestamp (oldest first)
  const sortedTransactions = [...transactions].sort((a, b) =>
    parseInt(a.timestamp) - parseInt(b.timestamp)
  );

  // Group by vault and build position history
  const vaultPositions = new Map<string, DailyPosition[]>();

  sortedTransactions.forEach(tx => {
    const vaultId = tx.vault.id;
    const timestamp = parseInt(tx.timestamp);
    const sharesAmount = parseFloat(tx.sharesAmount || '0');
    const assetAmountUSD = parseFloat(tx.assetAmountUSD || '0');
    const sharesBalanceAfter = parseFloat(tx.sharesBalanceAfter || '0');

    if (!vaultPositions.has(vaultId)) {
      vaultPositions.set(vaultId, []);
    }

    const positions = vaultPositions.get(vaultId)!;
    const lastPosition = positions[positions.length - 1];

    let totalInvested = lastPosition?.totalInvested || 0;
    let realizedPnL = lastPosition?.realizedPnL || 0;

    // Update cost basis and realized PnL based on transaction type
    if (tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN') {
      totalInvested += assetAmountUSD;
    } else if (tx.type === 'WITHDRAW' || tx.type === 'TRANSFER_OUT') {
      // Calculate proportional cost basis reduction
      const previousShares = lastPosition?.sharesBalance || 0;
      if (previousShares > 0) {
        const proportionWithdrawn = Math.abs(sharesAmount) / previousShares;
        const costBasisReduced = totalInvested * proportionWithdrawn;
        totalInvested -= costBasisReduced;

        // Calculate realized PnL: withdrawal amount - cost basis of withdrawn portion
        realizedPnL += assetAmountUSD - costBasisReduced;
      }
    }

    positions.push({
      timestamp,
      vaultId,
      sharesBalance: sharesBalanceAfter,
      totalInvested,
      realizedPnL,
    });
  });

  return vaultPositions;
};

export const processDailyPortfolioEvolution = (
  transactions: UserVaultTransaction[],
  vaultSnapshots: VaultDailySnapshot[]
): Array<{ time: string; value: number }> => {
  const daily = computeDailyPortfolioValues(transactions, vaultSnapshots);
  return daily.map((value) => ({
    time: new Date(value.timestamp * 1000).toISOString(),
    value: value.totalValueUSD,
  }));
};

export const processDailyCumulativePnL = (
  transactions: UserVaultTransaction[],
  vaultSnapshots: VaultDailySnapshot[]
): Array<{ time: string; value: number }> => {
  const daily = computeDailyPortfolioValues(transactions, vaultSnapshots);
  const changes: Array<{ time: string; value: number }> = [];
  let prev = 0;
  daily.forEach((v, idx) => {
    const delta = idx === 0 ? 0 : (v.totalPnLUSD - prev);
    changes.push({ time: new Date(v.timestamp * 1000).toISOString(), value: delta });
    prev = v.totalPnLUSD;
  });
  return changes;
};

// Computes daily percent PnL changes such that summing them yields cumulative percent PnL
export const processDailyPnLPercentEvolution = (
  transactions: UserVaultTransaction[],
  vaultSnapshots: VaultDailySnapshot[]
): Array<{ time: string; value: number }> => {
  if (!transactions || transactions.length === 0 || !vaultSnapshots || vaultSnapshots.length === 0) {
    return [];
  }

  const vaultPositions = buildDailyPositionHistory(transactions);

  const snapshotsByVault = new Map<string, Map<string, VaultDailySnapshot>>();
  vaultSnapshots.forEach(snapshot => {
    const vaultId = snapshot.vault.id;
    const dayKey = new Date(parseInt(snapshot.timestamp) * 1000).toISOString().split('T')[0];
    if (!snapshotsByVault.has(vaultId)) {
      snapshotsByVault.set(vaultId, new Map());
    }
    snapshotsByVault.get(vaultId)!.set(dayKey, snapshot);
  });

  const allDays = new Set<string>();
  vaultSnapshots.forEach(snapshot => {
    allDays.add(new Date(parseInt(snapshot.timestamp) * 1000).toISOString().split('T')[0]);
  });
  const sortedDays = Array.from(allDays).sort();

  const results: Array<{ time: string; value: number }> = [];
  if (sortedDays.length === 0) return results;

  // First day has no previous day to compare against
  results.push({ time: new Date(new Date(sortedDays[0] + 'T00:00:00Z').getTime()).toISOString(), value: 0 });

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDay = sortedDays[i - 1];
    const curDay = sortedDays[i];
    const prevTs = new Date(prevDay + 'T00:00:00Z').getTime() / 1000;

    let totalPrevValue = 0;
    let weightedReturnSum = 0;

    vaultPositions.forEach((positions, vaultId) => {
      const prevPosition = positions
        .filter(pos => pos.timestamp <= prevTs)
        .slice(-1)[0];
      if (!prevPosition || prevPosition.sharesBalance <= 0) return;

      const prevSnap = snapshotsByVault.get(vaultId)?.get(prevDay);
      const curSnap = snapshotsByVault.get(vaultId)?.get(curDay);
      if (!prevSnap || !curSnap) return;

      const prevPrice = prevSnap.sharePriceUSD ? parseFloat(prevSnap.sharePriceUSD) : NaN;
      const curPrice = curSnap.sharePriceUSD ? parseFloat(curSnap.sharePriceUSD) : NaN;
      if (!Number.isFinite(prevPrice) || !Number.isFinite(curPrice) || prevPrice <= 0) return;

      const prevValue = prevPosition.sharesBalance * prevPrice;
      const vaultReturn = (curPrice / prevPrice) - 1;
      totalPrevValue += prevValue;
      weightedReturnSum += prevValue * vaultReturn;
    });

    const portfolioReturn = totalPrevValue > 0 ? (weightedReturnSum / totalPrevValue) : 0;
    results.push({ time: new Date(new Date(curDay + 'T00:00:00Z').getTime()).toISOString(), value: portfolioReturn });
  }

  return results;
};

// Shared helper: compute daily portfolio value/invested/realized/unrealized/totalPnL per day
export const computeDailyPortfolioValues = (
  transactions: UserVaultTransaction[],
  vaultSnapshots: VaultDailySnapshot[]
): DailyPortfolioValue[] => {
  if (!transactions || transactions.length === 0 || !vaultSnapshots || vaultSnapshots.length === 0) {
    return [];
  }

  const vaultPositions = buildDailyPositionHistory(transactions);

  const snapshotsByVault = new Map<string, Map<string, VaultDailySnapshot>>();
  vaultSnapshots.forEach(snapshot => {
    const vaultId = snapshot.vault.id;
    const dayKey = new Date(parseInt(snapshot.timestamp) * 1000).toISOString().split('T')[0];
    if (!snapshotsByVault.has(vaultId)) {
      snapshotsByVault.set(vaultId, new Map());
    }
    snapshotsByVault.get(vaultId)!.set(dayKey, snapshot);
  });

  const allDays = new Set<string>();
  vaultSnapshots.forEach(snapshot => {
    allDays.add(new Date(parseInt(snapshot.timestamp) * 1000).toISOString().split('T')[0]);
  });

  const sortedDays = Array.from(allDays).sort();
  const dailyValues: DailyPortfolioValue[] = [];

  sortedDays.forEach(day => {
    const dayTimestamp = new Date(day + 'T00:00:00Z').getTime() / 1000;

    let totalValueUSD = 0;
    let totalInvestedUSD = 0;
    let totalRealizedPnL = 0;

    vaultPositions.forEach((positions, vaultId) => {
      const relevantPosition = positions
        .filter(pos => pos.timestamp <= dayTimestamp)
        .slice(-1)[0];
      if (!relevantPosition || relevantPosition.sharesBalance <= 0) return;
      const vaultSnapshot = snapshotsByVault.get(vaultId)?.get(day);
      if (!vaultSnapshot) return;
      const sharePriceUSD = vaultSnapshot.sharePriceUSD ? parseFloat(vaultSnapshot.sharePriceUSD) : NaN;
      const positionValueUSD = Number.isFinite(sharePriceUSD)
        ? relevantPosition.sharesBalance * sharePriceUSD
        : 0;
      totalValueUSD += positionValueUSD;
      totalInvestedUSD += relevantPosition.totalInvested;
      totalRealizedPnL += relevantPosition.realizedPnL;
    });

    if (totalValueUSD > 0 || totalInvestedUSD > 0) {
      const unrealizedPnL = totalValueUSD - totalInvestedUSD;
      const totalPnL = unrealizedPnL + totalRealizedPnL;
      dailyValues.push({
        timestamp: dayTimestamp,
        totalValueUSD,
        totalInvestedUSD,
        unrealizedPnLUSD: unrealizedPnL,
        realizedPnLUSD: totalRealizedPnL,
        totalPnLUSD: totalPnL,
      });
    }
  });

  return dailyValues.sort((a, b) => a.timestamp - b.timestamp);
};