import {
  ChevronDownIcon,
  ClockIcon,
  DocumentDownloadIcon,
  ExclamationIcon,
  LockClosedIcon,
  SearchIcon,
} from '@heroicons/react/outline';
import {
  Box,
  CircularProgress,
  Menu,
  MenuItem,
  SvgIcon,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { SearchInput } from 'src/components/SearchInput';
import { ConnectWalletButton } from 'src/components/WalletConnection/ConnectWalletButton';
import { applyTxHistoryFilters, useTransactionHistory } from 'src/hooks/useTransactionHistory';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { TRANSACTION_HISTORY } from 'src/utils/mixPanelEvents';

import { downloadData, formatTransactionData } from './helpers';
import { HistoryEmptyState } from './HistoryEmptyState';
import { HistoryFilterMenu } from './HistoryFilterMenu';
import { HistoryItemLoader } from './HistoryItemLoader';
import { HistoryWrapperMobile } from './HistoryWrapperMobile';
import TransactionRowItem, { TRANSACTION_ROW_GRID_TEMPLATE } from './TransactionRowItem';
import { FilterOptions, TransactionHistoryItemUnion } from './types';

// The four "quick" filters surfaced as pills, matching the design contract exactly
// (All / Supplies / Withdrawals / Borrows / Repayments). Rate change, collateral change,
// and liquidation stay reachable via the "More filters" control next to them.
const PRIMARY_FILTERS: { label: string; value: FilterOptions | null }[] = [
  { label: 'All', value: null },
  { label: 'Supplies', value: FilterOptions.SUPPLY },
  { label: 'Withdrawals', value: FilterOptions.WITHDRAW },
  { label: 'Borrows', value: FilterOptions.BORROW },
  { label: 'Repayments', value: FilterOptions.REPAY },
];

function EyebrowHeader({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'text.secondary',
        textAlign: align,
      }}
    >
      {children}
    </Typography>
  );
}

export const HistoryWrapper = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [filterQuery, setFilterQuery] = useState<FilterOptions[]>([]);
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);

  const isFilterActive = searchQuery.length > 0 || filterQuery.length > 0;
  const trackEvent = useRootStore((store) => store.trackEvent);

  const {
    data: transactions,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    fetchForDownload,
    subgraphUrl,
  } = useTransactionHistory({ isFilterActive });

  const handleJsonDownload = async () => {
    trackEvent(TRANSACTION_HISTORY.DOWNLOAD, { type: 'JSON' });
    setLoadingDownload(true);
    const data = await fetchForDownload({ searchQuery, filterQuery });
    const formattedData = formatTransactionData({ data, csv: false });
    const jsonData = JSON.stringify(formattedData, null, 2);
    downloadData('transactions.json', jsonData, 'application/json');
    setLoadingDownload(false);
  };

  const handleCsvDownload = async () => {
    trackEvent(TRANSACTION_HISTORY.DOWNLOAD, { type: 'CSV' });

    setLoadingDownload(true);
    const data: TransactionHistoryItemUnion[] = await fetchForDownload({
      searchQuery,
      filterQuery,
    });
    const formattedData = formatTransactionData({ data, csv: true });

    // Getting all the unique headers
    const headersSet = new Set<string>();
    formattedData.forEach((transaction: TransactionHistoryItemUnion) => {
      Object.keys(transaction).forEach((key) => headersSet.add(key));
    });

    const headers: string[] = Array.from(headersSet);
    let csvContent = headers.join(',') + '\n';

    formattedData.forEach((transaction: TransactionHistoryItemUnion) => {
      const row: string[] = headers.map((header) => {
        const value = transaction[header as keyof TransactionHistoryItemUnion];
        if (typeof value === 'object') {
          return JSON.stringify(value) ?? '';
        }
        return String(value) ?? '';
      });
      csvContent += row.join(',') + '\n';
    });

    downloadData('transactions.csv', csvContent, 'text/csv');
    setLoadingDownload(false);
  };

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [fetchNextPage, isLoading]
  );
  const downToMD = useMediaQuery(theme.breakpoints.down('md'));
  const { currentAccount, loading: web3Loading } = useWeb3Context();

  const flatTxns = useMemo(
    () => transactions?.pages?.flatMap((page) => page) || [],
    [transactions]
  );
  const filteredTxns = useMemo(
    () => applyTxHistoryFilters({ searchQuery, filterQuery, txns: flatTxns }),
    [searchQuery, filterQuery, flatTxns]
  );

  // Ghost-pill style shared by the filter pills and the export control.
  const pillSx = (active: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.75,
    height: 32,
    px: 1.75,
    borderRadius: '9999px',
    border: '1px solid',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
    transition: 'color 150ms ease, background-color 150ms ease, border-color 150ms ease',
    ...(active
      ? { bgcolor: 'background.paper', borderColor: 'divider', color: 'text.primary' }
      : {
          bgcolor: 'background.surface',
          borderColor: 'transparent',
          color: 'text.secondary',
          '&:hover': { color: 'text.primary' },
        }),
  });

  const isPrimaryActive = (value: FilterOptions | null) =>
    value === null
      ? filterQuery.length === 0
      : filterQuery.length === 1 && filterQuery[0] === value;

  const handlePrimaryFilterClick = (value: FilterOptions | null) => {
    if (value === null) {
      trackEvent(TRANSACTION_HISTORY.FILTER, { value: 'cleared' });
      setFilterQuery([]);
    } else {
      trackEvent(TRANSACTION_HISTORY.FILTER, { value });
      setFilterQuery([value]);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterQuery([]);
    setSearchResetKey((prevKey) => prevKey + 1); // Remount SearchInput component to clear search query
  };

  if (!subgraphUrl) {
    return (
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '20px',
          bgcolor: 'background.paper',
        }}
      >
        <HistoryEmptyState
          icon={ExclamationIcon}
          title="Transaction history unavailable"
          description="Transaction history is not currently available for this market."
        />
      </Box>
    );
  }

  if (!currentAccount) {
    return (
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '20px',
          bgcolor: 'background.paper',
        }}
      >
        {web3Loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 14 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <HistoryEmptyState
            icon={LockClosedIcon}
            title="Connect your wallet"
            description="Please connect your wallet to view transaction history."
            action={<ConnectWalletButton />}
          />
        )}
      </Box>
    );
  }

  if (downToMD) {
    return <HistoryWrapperMobile />;
  }

  const isEmpty = filteredTxns.length === 0;
  const filterActive = searchQuery !== '' || filterQuery.length > 0;

  return (
    <Box>
      {/* Filter bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
          mb: { xs: 3, md: 2.5 },
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          {PRIMARY_FILTERS.map((filter) => (
            <Box
              key={filter.label}
              sx={pillSx(isPrimaryActive(filter.value))}
              onClick={() => handlePrimaryFilterClick(filter.value)}
            >
              {filter.label}
            </Box>
          ))}
          <HistoryFilterMenu onFilterChange={setFilterQuery} currentFilter={filterQuery} />
        </Box>

        <Box sx={{ ml: { md: 'auto' }, display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
          <SearchInput
            onSearchTermChange={setSearchQuery}
            placeholder="Search assets…"
            wrapperSx={{ width: 220, height: 32, borderRadius: '9999px' }}
            key={searchResetKey}
          />
          <Box
            sx={pillSx(false)}
            onClick={(e) => setExportAnchor(e.currentTarget)}
            aria-haspopup="true"
            role="button"
          >
            {loadingDownload ? (
              <CircularProgress size={14} sx={{ color: 'text.secondary' }} />
            ) : (
              <SvgIcon sx={{ fontSize: 16 }}>
                <DocumentDownloadIcon />
              </SvgIcon>
            )}
            Export
            <ChevronDownIcon style={{ width: 12, height: 12 }} />
          </Box>
          <Menu
            anchorEl={exportAnchor}
            open={Boolean(exportAnchor)}
            onClose={() => setExportAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setExportAnchor(null);
                handleCsvDownload();
              }}
            >
              Export as .CSV
            </MenuItem>
            <MenuItem
              onClick={() => {
                setExportAnchor(null);
                handleJsonDownload();
              }}
            >
              Export as .JSON
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Activity table */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '20px',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: TRANSACTION_ROW_GRID_TEMPLATE,
            columnGap: 2,
            alignItems: 'center',
            px: 4,
            py: 1.5,
            bgcolor: 'background.surface',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <EyebrowHeader>Type</EyebrowHeader>
          <EyebrowHeader>Source</EyebrowHeader>
          <EyebrowHeader align="right">Amount</EyebrowHeader>
          <EyebrowHeader align="right">Time</EyebrowHeader>
          <Box />
        </Box>

        {isLoading ? (
          <HistoryItemLoader />
        ) : !isEmpty ? (
          filteredTxns.map((transaction: TransactionHistoryItemUnion, index: number) => {
            const isLastItem = index === filteredTxns.length - 1;
            return (
              <div ref={isLastItem ? lastElementRef : null} key={index}>
                <TransactionRowItem transaction={transaction as TransactionHistoryItemUnion} />
              </div>
            );
          })
        ) : filterActive ? (
          <HistoryEmptyState
            icon={SearchIcon}
            title="Nothing found"
            description="We couldn't find any transactions related to your search. Try again with a different asset name, or reset filters."
            action={
              <Box
                sx={pillSx(false)}
                onClick={resetFilters}
                role="button"
                aria-label="Reset filters"
              >
                Reset filters
              </Box>
            }
          />
        ) : !isFetchingNextPage ? (
          <HistoryEmptyState icon={ClockIcon} title="No transactions yet" />
        ) : null}

        {isFetchingNextPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={20} sx={{ color: alpha(theme.palette.text.secondary, 0.6) }} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HistoryWrapper;
