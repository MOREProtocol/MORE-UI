import { formatUnits } from 'ethers/lib/utils';
import { fetchIconSymbolAndName, IconSymbolInterface } from 'src/ui-config/reservePatches';

import {
  hasAmountAndReserve,
  hasCollateralReserve,
  hasPrincipalReserve,
  hasReserve,
  hasSwapBorrowRate,
  TransactionHistoryItemUnion,
} from './types';

export const unixTimestampToFormattedTime = ({ unixTimestamp }: { unixTimestamp: number }) => {
  const date = new Date(unixTimestamp * 1000);
  const hours24 = date.getHours();
  const hours12 = ((hours24 + 24 - 1) % 12) + 1; // Convert to 12-hour format
  const minutes = date.getMinutes();
  const amOrPm = hours24 < 12 ? 'AM' : 'PM';

  const formattedHours = String(hours12).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes} ${amOrPm}`;
};

// Short, muted relative-time label for the activity table's Time column, e.g. "5h ago".
// Falls back to a short date once the transaction is old enough that a duration reads poorly.
export const formatRelativeTime = (unixTimestamp: number): string => {
  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - unixTimestamp);

  if (diffSeconds < 60) return 'Just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;

  const date = new Date(unixTimestamp * 1000);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  }).format(date);
};

export const downloadData = (fileName: string, content: string, mimeType: string) => {
  const file = new Blob([content], { type: mimeType });
  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};

export const groupByDate = (
  transactions: TransactionHistoryItemUnion[]
): Record<string, TransactionHistoryItemUnion[]> => {
  return transactions.reduce((grouped, transaction) => {
    const date = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(transaction.timestamp * 1000));
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(transaction);
    return grouped;
  }, {} as Record<string, TransactionHistoryItemUnion[]>);
};

interface MappedReserveData {
  underlyingAsset: string;
  name: string;
  symbol: string;
  iconSymbol: string;
}

export const fetchIconSymbolAndNameHistorical = ({
  underlyingAsset,
  symbol,
  name,
}: IconSymbolInterface): MappedReserveData => {
  // Re-use general patches
  const reservePatch = fetchIconSymbolAndName({ underlyingAsset, symbol, name });

  // Fix AMM market names and symbol, specific to tx history
  const updatedPatch = {
    underlyingAsset,
    symbol: reservePatch.symbol.includes('Amm')
      ? reservePatch.iconSymbol.replace(/_/g, '')
      : reservePatch.symbol,
    name: reservePatch.name ?? (name || ''),
    iconSymbol: reservePatch.iconSymbol || '',
  };

  return updatedPatch;
};

interface FormatTransactionDataParams {
  data: TransactionHistoryItemUnion[];
  csv: boolean;
}

// Format raw data for CSV/JSON download
export const formatTransactionData = ({
  data,
  csv,
}: FormatTransactionDataParams): TransactionHistoryItemUnion[] => {
  return data.map((transaction: TransactionHistoryItemUnion) => {
    // Using any since txn objects can have different fields based on ActionFields, using union type + type guards gets extrenely complicated for formatting newTransaction
    //    since csv requires reserves formatted as strings with escape characters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newTransaction: any = { ...transaction };

    // Format amounts in reserve decimals, and stringify reserve objects to fix CSV formatting
    if (hasAmountAndReserve(transaction)) {
      newTransaction.amount = formatUnits(transaction.amount, transaction.reserve.decimals);
    }
    if (hasReserve(transaction) && csv) {
      const jsonString = JSON.stringify(transaction.reserve);
      newTransaction.reserve = `"${jsonString.replace(/"/g, '""')}"`;
    }

    if (hasCollateralReserve(transaction) && transaction.collateralAmount) {
      newTransaction.collateralAmount = formatUnits(
        transaction.collateralAmount,
        transaction.collateralReserve.decimals
      );
      if (csv) {
        const jsonString = JSON.stringify(transaction.collateralReserve);
        newTransaction.collateralReserve = `"${jsonString.replace(/"/g, '""')}"`;
      }
    }

    if (hasPrincipalReserve(transaction) && transaction.principalAmount) {
      newTransaction.principalAmount = formatUnits(
        transaction.principalAmount,
        transaction.principalReserve.decimals
      );
      if (csv) {
        const jsonString = JSON.stringify(transaction.principalReserve);
        newTransaction.principalReserve = `"${jsonString.replace(/"/g, '""')}"`;
      }
    }

    if (hasSwapBorrowRate(transaction)) {
      // RAY units (10^27) * 100 to express as percentage
      newTransaction.variableBorrowRate = formatUnits(transaction.variableBorrowRate, 25) + ' %';
      newTransaction.stableBorrowRate = formatUnits(transaction.stableBorrowRate, 25) + ' %';
    }

    // Match V2 action names with V3
    if (transaction.action === 'Deposit') {
      newTransaction.action = 'Supply';
    }
    if (transaction.action === 'Swap') {
      newTransaction.action = 'SwapBorrowRate';
    }
    // Consistent with UI
    if (transaction.action === 'RedeemUnderlying') {
      newTransaction.action = 'Withdraw';
    }

    return newTransaction;
  });
};
