import ArrowOutward from '@mui/icons-material/ArrowOutward';
import { Box, IconButton, SvgIcon, Typography } from '@mui/material';
import { formatUnits } from 'ethers/lib/utils';
import React from 'react';
import { DarkTooltip } from 'src/components/infoTooltips/DarkTooltip';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useRootStore } from 'src/store/root';
import { GENERAL } from 'src/utils/mixPanelEvents';

import { ActionDetails } from './actions/ActionDetails';
import {
  fetchIconSymbolAndNameHistorical,
  formatRelativeTime,
  unixTimestampToFormattedTime,
} from './helpers';
import { TransactionStatusPill } from './TransactionStatusPill';
import {
  ActionFields,
  hasAmountAndReserve,
  hasReserve,
  hasSwapBorrowRate,
  TransactionHistoryItem,
} from './types';

// Shared grid so the header row (in HistoryWrapper) and every row line up exactly.
export const TRANSACTION_ROW_GRID_TEMPLATE = '132px minmax(0, 1fr) 210px 92px 36px';

const AMOUNT_SIGN: Record<string, '+' | '−'> = {
  Supply: '+',
  Deposit: '+',
  Repay: '+',
  Borrow: '−',
  RedeemUnderlying: '−',
};

// "Kind" mirrors the design's venue label next to the source token (e.g. "USDF · Market").
// This history feed only ever surfaces market-side transactions, so the kind is derived
// from the action itself rather than invented data that isn't on the transaction.
const KIND_LABEL: Record<string, string> = {
  Supply: 'Market',
  Deposit: 'Market',
  Borrow: 'Market',
  Repay: 'Market',
  RedeemUnderlying: 'Market',
  UsageAsCollateral: 'Collateral',
  SwapBorrowRate: 'Rate',
  Swap: 'Rate',
  LiquidationCall: 'Liquidation',
};

interface TransactionHistoryItemProps {
  transaction: TransactionHistoryItem & ActionFields[keyof ActionFields];
}

function SourceCell({
  iconSymbol,
  symbol,
  name,
  kind,
}: {
  iconSymbol: string;
  symbol: string;
  name: string;
  kind: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <TokenIcon symbol={iconSymbol} sx={{ fontSize: '22px', flexShrink: 0 }} />
      <DarkTooltip
        title={
          <Typography variant="secondary14" color="common.white">
            {name} ({symbol})
          </Typography>
        }
        arrow
        placement="top"
      >
        <Typography variant="secondary14" color="text.primary" noWrap sx={{ minWidth: 0 }}>
          {symbol}{' '}
          <Box component="span" sx={{ color: 'text.muted' }}>
            · {kind}
          </Box>
        </Typography>
      </DarkTooltip>
    </Box>
  );
}

function AmountCell({
  sign,
  amount,
  symbol,
  usdValue,
}: {
  sign: '+' | '−';
  amount: string;
  symbol: string;
  usdValue: number;
}) {
  // Outflows are tinted like the mockup's withdraw row; inflows stay plain.
  const amountColor = sign === '−' ? 'error.main' : 'text.primary';
  return (
    <DarkTooltip
      title={
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormattedNumber
            value={amount}
            variant="secondary14"
            color="common.white"
            sx={{ mr: 1 }}
          />
          <Typography variant="secondary14" color="common.white">
            {symbol}
          </Typography>
        </Box>
      }
      arrow
      placement="top"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <Typography variant="main14" component="span" color={amountColor} sx={{ mr: 0.25 }}>
            {sign}
          </Typography>
          <FormattedNumber
            value={amount}
            symbol={symbol}
            compact
            compactThreshold={100000}
            variant="main14"
            symbolsVariant="main14"
            color={amountColor}
            symbolsColor={amountColor}
          />
        </Box>
        {usdValue > 0 ? (
          <FormattedNumber
            value={usdValue}
            symbol="USD"
            compact
            compactThreshold={100000}
            variant="secondary12"
            symbolsVariant="secondary12"
            symbolsColor="text.secondary"
            sx={{ color: 'text.secondary' }}
          />
        ) : (
          <Typography variant="secondary12" sx={{ color: 'text.secondary' }}>
            Price unavailable
          </Typography>
        )}
      </Box>
    </DarkTooltip>
  );
}

function CollateralStatusCell({ enabled }: { enabled: boolean }) {
  return (
    <Typography
      variant="secondary14"
      sx={{ color: enabled ? 'success.main' : 'text.secondary', fontWeight: 600 }}
    >
      {enabled ? 'Enabled' : 'Disabled'}
    </Typography>
  );
}

function TimeCell({ timestamp }: { timestamp: number }) {
  // Absolute date + time so transactions older than a day (where the row shows
  // only a relative label like "5d ago" / a short date) stay recoverable.
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp * 1000));
  return (
    <DarkTooltip
      title={
        <Typography variant="secondary14" color="common.white">
          {formattedDate} · {unixTimestampToFormattedTime({ unixTimestamp: timestamp })}
        </Typography>
      }
      arrow
      placement="top"
    >
      <Typography variant="caption" sx={{ color: 'text.muted', whiteSpace: 'nowrap' }}>
        {formatRelativeTime(timestamp)}
      </Typography>
    </DarkTooltip>
  );
}

function TransactionRowItem({ transaction }: TransactionHistoryItemProps) {
  const { currentNetworkConfig, trackEvent } = useRootStore((state) => ({
    currentNetworkConfig: state.currentNetworkConfig,
    trackEvent: state.trackEvent,
  }));

  const explorerLink = currentNetworkConfig.explorerLinkBuilder({ tx: transaction.txHash });
  const kind = KIND_LABEL[transaction.action] ?? 'Market';

  let middle: React.ReactNode;

  if (hasAmountAndReserve(transaction)) {
    // Supply, Deposit, Borrow, Repay, RedeemUnderlying — the common case, split cleanly
    // into a SOURCE cell and a mono, signed AMOUNT cell per the design.
    const reserve = fetchIconSymbolAndNameHistorical(transaction.reserve);
    const amount = formatUnits(transaction.amount, transaction.reserve.decimals);
    const usdValue = Number(transaction.assetPriceUSD) * Number(amount);
    const sign = AMOUNT_SIGN[transaction.action] ?? '+';

    middle = (
      <>
        <SourceCell
          iconSymbol={reserve.iconSymbol}
          symbol={reserve.symbol}
          name={reserve.name}
          kind={kind}
        />
        <AmountCell sign={sign} amount={amount} symbol={reserve.symbol} usdValue={usdValue} />
      </>
    );
  } else if (hasReserve(transaction) && !hasSwapBorrowRate(transaction)) {
    // UsageAsCollateral — has a reserve but no amount; show an enabled/disabled indicator instead.
    const collateralTx = transaction as TransactionHistoryItem<ActionFields['UsageAsCollateral']>;
    const reserve = fetchIconSymbolAndNameHistorical(collateralTx.reserve);

    middle = (
      <>
        <SourceCell
          iconSymbol={reserve.iconSymbol}
          symbol={reserve.symbol}
          name={reserve.name}
          kind={kind}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <CollateralStatusCell enabled={collateralTx.toState} />
        </Box>
      </>
    );
  } else {
    // Rare/complex shapes (rate mode swaps, liquidations) keep their existing, well-tested
    // detail rendering, spanning the source+amount columns rather than reinventing it.
    middle = (
      <Box sx={{ gridColumn: '2 / span 2', display: 'flex', alignItems: 'center' }}>
        <ActionDetails transaction={transaction} iconSize="20px" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: TRANSACTION_ROW_GRID_TEMPLATE,
        alignItems: 'center',
        columnGap: 2,
        px: 4,
        py: 2.5,
        '&:not(:last-of-type)': {
          borderBottom: '1px solid',
          borderColor: 'divider',
        },
        '&:hover': {
          bgcolor: 'background.surface',
        },
      }}
    >
      <Box>
        <TransactionStatusPill action={transaction.action} />
      </Box>

      {middle}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <TimeCell timestamp={transaction.timestamp} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton
          size="small"
          href={explorerLink}
          target="_blank"
          rel="noopener"
          onClick={() =>
            trackEvent(GENERAL.EXTERNAL_LINK, { funnel: 'TxHistoy', Link: 'Etherscan' })
          }
          sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
        >
          <SvgIcon sx={{ fontSize: '16px' }}>
            <ArrowOutward />
          </SvgIcon>
        </IconButton>
      </Box>
    </Box>
  );
}

export default TransactionRowItem;
