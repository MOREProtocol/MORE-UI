import { valueToBigNumber } from '@aave/math-utils';
import {
  ArrowNarrowRightIcon,
  ChartBarIcon,
  ClockIcon,
  CollectionIcon,
  CreditCardIcon,
} from '@heroicons/react/outline';
import { Box, CircularProgress, Skeleton, SvgIcon, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { ReactNode, useMemo } from 'react';
import { PageMasthead } from 'src/components/PageMasthead';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { Link, ROUTES } from 'src/components/primitives/Link';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { ConnectWalletButton } from 'src/components/WalletConnection/ConnectWalletButton';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { getVaultFactoryInfo } from 'src/hooks/vault/factoryRegistry';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import {
  useAssetsData,
  useDeployedVaults,
  useOmniDeployedVaults,
  useUserVaultsData,
  useVaultsListData,
} from 'src/hooks/vault/useVaultData';
import { useTransactionHistory } from 'src/hooks/useTransactionHistory';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { FONT_DISPLAY, FONT_MONO } from 'src/utils/theme';

import { HistoryEmptyState } from '../history/HistoryEmptyState';
import { HistoryItemLoader } from '../history/HistoryItemLoader';
import TransactionRowItem, { TRANSACTION_ROW_GRID_TEMPLATE } from '../history/TransactionRowItem';
import { TransactionHistoryItemUnion } from '../history/types';
import { useReserveMap } from '../markets/hooks';

// Number of recent activity rows surfaced on the dashboard before deferring to /history.
const RECENT_ACTIVITY_LIMIT = 8;

// --------------------------------------------------------------------------------------
// Shared card recipe (mirrors VaultCards.tsx so position rows read as the same system).
// --------------------------------------------------------------------------------------
const CARD_SX = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '20px',
  transition: 'border-color 150ms ease',
  textDecoration: 'none',
  '&:hover': { borderColor: 'primary.main' },
} as const;

const StatLabel = ({ children }: { children: ReactNode }) => (
  <Typography
    sx={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'text.secondary',
    }}
  >
    {children}
  </Typography>
);

type PillVariant = 'vault' | 'supply' | 'borrow';

const Pill = ({ label, variant }: { label: string; variant: PillVariant }) => (
  <Box
    sx={(theme) => {
      const color =
        variant === 'vault'
          ? theme.palette.primary.main
          : variant === 'supply'
          ? theme.palette.success.main
          : theme.palette.info.main;
      return {
        display: 'inline-flex',
        alignItems: 'center',
        height: 20,
        px: 1,
        borderRadius: '9999px',
        bgcolor: alpha(color, 0.12),
        color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      };
    }}
  >
    {label}
  </Box>
);

const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  actionHref,
}: {
  title: string;
  subtitle?: string;
  actionLabel: string;
  actionHref: string;
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: { xs: 'flex-start', sm: 'flex-end' },
      justifyContent: 'space-between',
      gap: 2,
      mb: 2.5,
    }}
  >
    <Box>
      <Typography
        sx={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: '-0.01em',
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="secondary14" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    <Typography
      component={Link}
      href={actionHref}
      noLinkStyle
      sx={{
        flexShrink: 0,
        fontSize: 14,
        fontWeight: 600,
        color: 'primary.main',
        whiteSpace: 'nowrap',
        '&:hover': { color: 'primary.main', textDecoration: 'underline' },
      }}
    >
      {actionLabel} →
    </Typography>
  </Box>
);

// --------------------------------------------------------------------------------------
// Position row (used for both vault and market positions). Links to the detail page.
// --------------------------------------------------------------------------------------
interface PositionCell {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

const PositionCard = ({
  href,
  iconSymbol,
  name,
  pillLabel,
  pillVariant,
  venue,
  cells,
}: {
  href: string;
  iconSymbol: string;
  name: string;
  pillLabel: string;
  pillVariant: PillVariant;
  venue: string;
  cells: PositionCell[];
}) => (
  <Box
    component={Link}
    href={href}
    noLinkStyle
    sx={{
      ...CARD_SX,
      p: { xs: 2.5, md: 3 },
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      alignItems: { xs: 'flex-start', md: 'center' },
      gap: { xs: 2.5, md: 3 },
    }}
  >
    {/* Asset */}
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: { md: '1 1 0' }, minWidth: 0 }}
    >
      <TokenIcon symbol={iconSymbol} sx={{ fontSize: '36px', flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            fontSize: 16,
            color: 'text.primary',
            lineHeight: 1.2,
          }}
        >
          {name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
          <Pill label={pillLabel} variant={pillVariant} />
          <Typography variant="secondary12" sx={{ color: 'text.secondary' }}>
            · {venue}
          </Typography>
        </Box>
      </Box>
    </Box>

    {/* Cells */}
    {cells.map((cell, index) => (
      <Box key={index} sx={{ minWidth: { md: 140 } }}>
        <StatLabel>{cell.label}</StatLabel>
        <Box sx={{ mt: 0.5 }}>{cell.value}</Box>
        {cell.sub && <Box sx={{ mt: 0.25 }}>{cell.sub}</Box>}
      </Box>
    ))}

    <SvgIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }}>
      <ArrowNarrowRightIcon />
    </SvgIcon>
  </Box>
);

// --------------------------------------------------------------------------------------
// Vault position derivation — composes the same existing hooks VaultAssetsList uses.
// --------------------------------------------------------------------------------------
interface VaultPositionRow {
  id: string;
  name: string;
  symbol: string;
  deposit: string; // asset units, formatted
  depositUsd: number;
  apy: number | undefined;
}

const useVaultPositions = () => {
  const { chainId, accountAddress } = useVault();

  const deployedVaultsQuery = useDeployedVaults();
  const omniVaultsQuery = useOmniDeployedVaults();
  const rawVaultIds = [...(deployedVaultsQuery?.data ?? []), ...(omniVaultsQuery?.data ?? [])];
  const vaultIds = Array.from(new Set(rawVaultIds.map((v) => v.toLowerCase())));

  const vaultsQuery = useVaultsListData(vaultIds);
  const vaults: VaultData[] | undefined = vaultsQuery?.data;

  const uniqueAssetAddresses = useMemo(() => {
    if (!vaults) return [] as string[];
    const addresses = vaults
      .map((vault) => vault?.overview?.asset?.address)
      .filter(Boolean) as string[];
    return [...new Set(addresses)];
  }, [vaults]);

  const preferredOracleByAsset = useMemo(() => {
    const map = new Map<string, string>();
    if (!vaults) return map;
    vaults.forEach((v) => {
      const asset = v?.overview?.asset?.address;
      if (!asset) return;
      const info = getVaultFactoryInfo(chainId, v.id);
      if (info?.oracleAddress) {
        const key = asset.toLowerCase();
        if (!map.has(key)) map.set(key, info.oracleAddress);
      }
    });
    return map;
  }, [vaults, chainId]);

  const assetsDataQuery = useAssetsData(uniqueAssetAddresses, preferredOracleByAsset);
  const assetPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (assetsDataQuery.data) {
      assetsDataQuery.data.forEach((assetData) => {
        if (assetData) map.set(assetData.address.toLowerCase(), assetData.price || 0);
      });
    }
    return map;
  }, [assetsDataQuery.data]);

  const userVaultsQuery = useUserVaultsData(accountAddress, vaultIds, {
    enabled: !!accountAddress && vaultIds.length > 0,
  });
  const userVaults: Array<
    { maxWithdraw: ethers.BigNumber; decimals: number; assetDecimals: number } | undefined
  > = userVaultsQuery?.map((vault) => vault.data) || [];

  const isLoading =
    deployedVaultsQuery?.isLoading || vaultsQuery?.isLoading || assetsDataQuery.isLoading;

  const { positions, totalDepositedUsd } = useMemo(() => {
    const rows: VaultPositionRow[] = [];
    let total = valueToBigNumber(0);
    if (!accountAddress || !vaults) return { positions: rows, totalDepositedUsd: 0 };

    vaults.forEach((vault, index) => {
      const userVaultData = userVaults[index];
      const assetAddress = vault?.overview?.asset?.address?.toLowerCase() || '';
      const assetPrice = assetPriceMap.get(assetAddress) || 0;
      const assetDecimals = vault?.overview?.asset?.decimals || 18;
      const userDeposit = userVaultData?.maxWithdraw || '0';
      const depositFormatted = userVaultData
        ? formatUnits(userDeposit.toString(), assetDecimals)
        : '0';
      const depositAmount = parseFloat(depositFormatted);

      if (depositAmount <= 0) return;

      const depositUsd = new BigNumber(depositFormatted).multipliedBy(assetPrice);
      total = total.plus(depositUsd);
      rows.push({
        id: vault.id,
        name: vault.overview?.name || 'Unnamed Vault',
        symbol: vault.overview?.asset?.symbol || 'UNKNOWN',
        deposit: depositFormatted,
        depositUsd: depositUsd.toNumber(),
        apy:
          typeof vault.overview?.apy7Days === 'number'
            ? vault.overview?.apy7Days
            : vault.overview?.apy,
      });
    });

    return { positions: rows, totalDepositedUsd: total.toNumber() };
  }, [vaults, userVaults, assetPriceMap, accountAddress]);

  return { positions, totalDepositedUsd, isLoading };
};

// --------------------------------------------------------------------------------------
// Market position derivation — mirrors MyPositions (supplies / borrows from user summary).
// --------------------------------------------------------------------------------------
interface MarketPositionRow {
  id: string;
  underlyingAsset: string;
  iconSymbol: string;
  assetSymbol: string;
  tokenBalance: number;
  balanceUsd: number;
  apy: number;
}

// --------------------------------------------------------------------------------------
// Summary strip (Vaults / Markets roll-up). Omits stats without an existing data source.
// --------------------------------------------------------------------------------------
const StripItem = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box>
    <StatLabel>{label}</StatLabel>
    <Box sx={{ mt: 0.75 }}>{children}</Box>
  </Box>
);

const StripGroupHead = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2 }}>
    <SvgIcon sx={{ fontSize: 16, color: 'primary.main' }}>{icon}</SvgIcon>
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'primary.main',
      }}
    >
      {label}
    </Typography>
  </Box>
);

// --------------------------------------------------------------------------------------
// Recent activity — Task 16 table components, capped at RECENT_ACTIVITY_LIMIT rows.
// --------------------------------------------------------------------------------------
const RecentActivity = () => {
  const {
    data: transactions,
    isLoading,
    subgraphUrl,
  } = useTransactionHistory({ isFilterActive: false });

  const flatTxns = useMemo(
    () => (transactions?.pages?.flatMap((page) => page) || []).slice(0, RECENT_ACTIVITY_LIMIT),
    [transactions]
  );

  const EyebrowHeader = ({
    children,
    align = 'left',
  }: {
    children: ReactNode;
    align?: 'left' | 'right';
  }) => (
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

  return (
    <Box component="section">
      <SectionHeader title="Recent activity" actionLabel="View all" actionHref={ROUTES.history} />
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
        ) : !subgraphUrl ? (
          <HistoryEmptyState
            icon={ClockIcon}
            title="Transaction history unavailable"
            description="Transaction history is not currently available for this market."
          />
        ) : flatTxns.length > 0 ? (
          flatTxns.map((transaction: TransactionHistoryItemUnion, index: number) => (
            <TransactionRowItem
              key={index}
              transaction={transaction as TransactionHistoryItemUnion}
            />
          ))
        ) : (
          <HistoryEmptyState icon={ClockIcon} title="No transactions yet" />
        )}
      </Box>
    </Box>
  );
};

// --------------------------------------------------------------------------------------
// Disconnected state — centered connect-wallet empty state (dashboard-disconnected.png).
// --------------------------------------------------------------------------------------
const DashboardDisconnected = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: { xs: '60vh', md: '70vh' },
    }}
  >
    <HistoryEmptyState
      icon={CreditCardIcon}
      title="Connect your wallet"
      description="Connect to see your portfolio, positions, and activity across MORE Markets."
      action={<ConnectWalletButton funnel="Dashboard" />}
    />
  </Box>
);

// --------------------------------------------------------------------------------------
// Connected state.
// --------------------------------------------------------------------------------------
const DashboardConnected = () => {
  const theme = useTheme();
  const { user, loading: appLoading } = useAppDataContext();
  const reserveByUnderlying = useReserveMap();
  const {
    positions: vaultPositions,
    totalDepositedUsd,
    isLoading: vaultsLoading,
  } = useVaultPositions();

  const supplies: MarketPositionRow[] = useMemo(() => {
    const data = user?.userReservesData || [];
    return data
      .filter((ur) => ur.underlyingBalance !== '0')
      .map((ur) => {
        const reserve = reserveByUnderlying.get(ur.reserve.underlyingAsset.toLowerCase());
        const apy =
          typeof ur.reserve.supplyAPY === 'number'
            ? ur.reserve.supplyAPY
            : parseFloat(String(ur.reserve.supplyAPY || 0));
        return {
          id: ur.reserve.underlyingAsset,
          underlyingAsset: ur.reserve.underlyingAsset,
          iconSymbol: reserve?.iconSymbol || ur.reserve.symbol,
          assetSymbol: ur.reserve.symbol,
          tokenBalance: parseFloat(ur.underlyingBalance || '0'),
          balanceUsd: parseFloat(ur.underlyingBalanceUSD || '0'),
          apy,
        };
      });
  }, [user, reserveByUnderlying]);

  const borrows: MarketPositionRow[] = useMemo(() => {
    const data = user?.userReservesData || [];
    return data
      .filter((ur) => ur.variableBorrows !== '0' || ur.stableBorrows !== '0')
      .map((ur) => {
        const variableUsd = parseFloat(ur.variableBorrowsUSD || '0');
        const stableUsd = parseFloat(ur.stableBorrowsUSD || '0');
        const reserve = reserveByUnderlying.get(ur.reserve.underlyingAsset.toLowerCase());
        const apy =
          variableUsd > 0
            ? typeof ur.reserve.variableBorrowAPY === 'number'
              ? ur.reserve.variableBorrowAPY
              : parseFloat(String(ur.reserve.variableBorrowAPY || 0))
            : typeof ur.reserve.stableBorrowAPY === 'number'
            ? ur.reserve.stableBorrowAPY
            : parseFloat(String(ur.reserve.stableBorrowAPY || 0));
        return {
          id: ur.reserve.underlyingAsset,
          underlyingAsset: ur.reserve.underlyingAsset,
          iconSymbol: reserve?.iconSymbol || ur.reserve.symbol,
          assetSymbol: ur.reserve.symbol,
          tokenBalance: parseFloat(ur.variableBorrows || '0') + parseFloat(ur.stableBorrows || '0'),
          balanceUsd: variableUsd + stableUsd,
          apy,
        };
      });
  }, [user, reserveByUnderlying]);

  const marketsNetWorth = Number(user?.netWorthUSD || 0);
  const netWorth = marketsNetWorth + totalDepositedUsd;
  const heroLoading = appLoading || vaultsLoading;

  const hf = Number(user?.healthFactor || 0);
  const showHealthFactor = user?.healthFactor !== '-1' && user?.healthFactor !== undefined;
  const hfColor =
    hf >= 3
      ? theme.palette.success.main
      : hf < 1.1
      ? theme.palette.error.main
      : theme.palette.warning.main;
  const hfLabel = hf >= 3 ? 'Safe' : hf < 1.1 ? 'At risk' : 'Caution';

  return (
    <>
      <PageMasthead
        title="Dashboard"
        subtitle="Your positions, earnings, and activity across MORE Markets."
      />

      {/* Net worth hero */}
      <Box
        sx={{
          ...CARD_SX,
          cursor: 'default',
          '&:hover': { borderColor: 'divider' },
          p: { xs: 3, md: 4 },
          mb: { xs: 3, md: 4 },
        }}
      >
        <StatLabel>Net worth in protocol</StatLabel>
        <Box sx={{ mt: 1.5 }}>
          {heroLoading ? (
            <Skeleton width={200} height={52} />
          ) : (
            <FormattedNumber
              value={netWorth}
              symbol="USD"
              compact
              visibleDecimals={2}
              symbolsVariant="main25"
              symbolsColor="text.secondary"
              sx={{
                fontFamily: FONT_MONO,
                fontWeight: 600,
                fontSize: { xs: 32, md: 40 },
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            />
          )}
        </Box>
      </Box>

      {/* Vaults / Markets summary strip */}
      <Box
        sx={{
          ...CARD_SX,
          cursor: 'default',
          '&:hover': { borderColor: 'divider' },
          bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
          p: { xs: 3, md: 3.5 },
          mb: { xs: 5, md: 6 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'stretch' },
          gap: { xs: 4, md: 0 },
        }}
      >
        <Box sx={{ flex: { md: '0 0 auto' }, pr: { md: 6 } }}>
          <StripGroupHead icon={<CollectionIcon />} label="Vaults" />
          <StripItem label="Deposited">
            {heroLoading ? (
              <Skeleton width={90} height={28} />
            ) : (
              <FormattedNumber
                value={totalDepositedUsd}
                symbol="USD"
                compact
                visibleDecimals={2}
                variant="main21"
                symbolsVariant="secondary16"
                symbolsColor="text.secondary"
              />
            )}
          </StripItem>
        </Box>

        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            width: '1px',
            bgcolor: 'divider',
            mx: 4,
          }}
        />

        <Box sx={{ flex: '1 1 auto' }}>
          <StripGroupHead icon={<ChartBarIcon />} label="Markets" />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, auto)' },
              gap: { xs: 3, sm: 8 },
            }}
          >
            <StripItem label="Supplied">
              <FormattedNumber
                value={Number(user?.totalLiquidityUSD || 0)}
                symbol="USD"
                compact
                visibleDecimals={2}
                variant="main21"
                symbolsVariant="secondary16"
                symbolsColor="text.secondary"
              />
            </StripItem>
            <StripItem label="Borrowed">
              <FormattedNumber
                value={Number(user?.totalBorrowsUSD || 0)}
                symbol="USD"
                compact
                visibleDecimals={2}
                variant="main21"
                symbolsVariant="secondary16"
                symbolsColor="text.secondary"
              />
              <Typography variant="secondary12" sx={{ color: 'text.secondary', mt: 0.25 }}>
                <FormattedNumber
                  value={Number(user?.totalCollateralUSD || 0)}
                  symbol="USD"
                  compact
                  visibleDecimals={2}
                  variant="secondary12"
                  symbolsVariant="secondary12"
                  symbolsColor="text.secondary"
                  sx={{ color: 'text.secondary' }}
                />{' '}
                collateral
              </Typography>
            </StripItem>
            {showHealthFactor && (
              <StripItem label="Health factor">
                <FormattedNumber
                  value={hf}
                  visibleDecimals={2}
                  variant="main21"
                  sx={{ color: hfColor }}
                />
                <Typography variant="secondary12" sx={{ color: hfColor, mt: 0.25 }}>
                  {hfLabel}
                </Typography>
              </StripItem>
            )}
          </Box>
        </Box>
      </Box>

      {/* Vault positions */}
      {vaultPositions.length > 0 && (
        <Box component="section" sx={{ mb: { xs: 5, md: 6 } }}>
          <SectionHeader
            title="Vault positions"
            subtitle="Curated, one-click strategies"
            actionLabel="Explore vaults"
            actionHref={ROUTES.vaults}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {vaultPositions.map((row) => (
              <PositionCard
                key={row.id}
                href={ROUTES.vaultDetail(row.id)}
                iconSymbol={row.symbol}
                name={row.name}
                pillLabel="Vault"
                pillVariant="vault"
                venue={row.symbol}
                cells={[
                  {
                    label: 'Deposited',
                    value: (
                      <FormattedNumber
                        value={row.deposit}
                        symbol={row.symbol}
                        compact
                        variant="main14"
                        symbolsVariant="secondary14"
                        symbolsColor="text.secondary"
                      />
                    ),
                    sub: (
                      <FormattedNumber
                        value={row.depositUsd}
                        symbol="USD"
                        compact
                        variant="secondary12"
                        symbolsVariant="secondary12"
                        symbolsColor="text.secondary"
                        sx={{ color: 'text.secondary' }}
                      />
                    ),
                  },
                  {
                    label: 'APY',
                    value:
                      typeof row.apy === 'number' ? (
                        <FormattedNumber
                          value={row.apy}
                          percent
                          coloredPercent
                          visibleDecimals={2}
                          variant="main14"
                          symbolsVariant="secondary14"
                        />
                      ) : (
                        <Typography variant="main14">–</Typography>
                      ),
                  },
                ]}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Market positions */}
      {supplies.length + borrows.length > 0 && (
        <Box component="section" sx={{ mb: { xs: 5, md: 6 } }}>
          <SectionHeader
            title="Market positions"
            subtitle="Direct lending and borrowing across assets"
            actionLabel="Explore markets"
            actionHref={ROUTES.markets}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {supplies.map((row) => (
              <PositionCard
                key={`supply-${row.id}`}
                href={ROUTES.reserveOverview(row.underlyingAsset)}
                iconSymbol={row.iconSymbol}
                name={row.assetSymbol}
                pillLabel="Supply"
                pillVariant="supply"
                venue="Market"
                cells={[
                  {
                    label: 'Supplied',
                    value: (
                      <FormattedNumber
                        value={row.tokenBalance}
                        symbol={row.assetSymbol}
                        compact
                        variant="main14"
                        symbolsVariant="secondary14"
                        symbolsColor="text.secondary"
                      />
                    ),
                    sub: (
                      <FormattedNumber
                        value={row.balanceUsd}
                        symbol="USD"
                        compact
                        variant="secondary12"
                        symbolsVariant="secondary12"
                        symbolsColor="text.secondary"
                        sx={{ color: 'text.secondary' }}
                      />
                    ),
                  },
                  {
                    label: 'Supply APY',
                    value: (
                      <FormattedNumber
                        value={row.apy}
                        percent
                        coloredPercent
                        visibleDecimals={2}
                        variant="main14"
                        symbolsVariant="secondary14"
                      />
                    ),
                  },
                ]}
              />
            ))}
            {borrows.map((row) => (
              <PositionCard
                key={`borrow-${row.id}`}
                href={ROUTES.reserveOverview(row.underlyingAsset)}
                iconSymbol={row.iconSymbol}
                name={row.assetSymbol}
                pillLabel="Borrow"
                pillVariant="borrow"
                venue="Market"
                cells={[
                  {
                    label: 'Borrowed',
                    value: (
                      <FormattedNumber
                        value={row.tokenBalance}
                        symbol={row.assetSymbol}
                        compact
                        variant="main14"
                        symbolsVariant="secondary14"
                        symbolsColor="text.secondary"
                      />
                    ),
                    sub: (
                      <FormattedNumber
                        value={row.balanceUsd}
                        symbol="USD"
                        compact
                        variant="secondary12"
                        symbolsVariant="secondary12"
                        symbolsColor="text.secondary"
                        sx={{ color: 'text.secondary' }}
                      />
                    ),
                  },
                  {
                    label: 'Borrow APY',
                    value: (
                      <FormattedNumber
                        value={row.apy}
                        percent
                        visibleDecimals={2}
                        variant="main14"
                        symbolsVariant="secondary14"
                      />
                    ),
                  },
                ]}
              />
            ))}
          </Box>
        </Box>
      )}

      <RecentActivity />
    </>
  );
};

// --------------------------------------------------------------------------------------
// Container — branches on wallet connection.
// --------------------------------------------------------------------------------------
export const DashboardContainer = () => {
  const { currentAccount, loading: web3Loading } = useWeb3Context();

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1600,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        pt: { xs: 3, md: 3 },
        pb: { xs: 6, md: 12 },
      }}
    >
      {currentAccount ? (
        <DashboardConnected />
      ) : web3Loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <DashboardDisconnected />
      )}
    </Box>
  );
};

export default DashboardContainer;
