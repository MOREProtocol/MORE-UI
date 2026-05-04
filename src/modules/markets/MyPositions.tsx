import { Box, IconButton, Typography, Collapse, Switch, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useMemo, useState } from 'react';
import { normalize, UserIncentiveData, valueToBigNumber } from '@aave/math-utils';
import { UserAccruingReward, useUserPoolReservesRewardsHumanized } from 'src/hooks/pool/useUserPoolReservesRewards';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { PositionRow } from './types';
import { useReserveMap, useRewardsMaps, sumIncentivesApr, sumRewardsApr } from './hooks';
import { useModalContext } from 'src/hooks/useModal';
import { ChainId, InterestRate } from '@aave/contract-helpers';
import { useWalletBalances } from 'src/hooks/app-data-provider/useWalletBalances';
import { getMaxAmountAvailableToSupply } from 'src/utils/getMaxAmountAvailableToSupply';
import { getMaxAmountAvailableToBorrow, assetCanBeBorrowedByUser } from 'src/utils/getMaxAmountAvailableToBorrow';
import { useRootStore } from 'src/store/root';
import { GENERAL } from 'src/utils/mixPanelEvents';
import { TextWithTooltip } from 'src/components/TextWithTooltip';
import { EmodeModalType } from 'src/components/transactions/Emode/EmodeModalContent';
import { Link } from 'src/components/primitives/Link';
import { SupplyPositionRow, BorrowPositionRow, PositionRowSkeleton } from './PositionRowPlate';

export function MyPositions() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user, loading, reserves } = useAppDataContext();
  const [myPositionsOpen, setMyPositionsOpen] = useState(true);
  const reserveByUnderlying = useReserveMap();
  const { rewardsByAddress } = useRewardsMaps();
  const { openSupply, openWithdraw, openBorrow, openRepay, openClaimRewards, openEmode } = useModalContext();
  const { currentMarket, trackEvent, currentMarketData, currentNetworkConfig } = useRootStore();
  const account = useRootStore((s) => s.account);
  const minRemainingBaseTokenBalance = useRootStore((s) => s.poolComputed.minRemainingBaseTokenBalance);
  const { walletBalances } = useWalletBalances(currentMarketData);
  const ltv = useMemo(() => {
    const collateralRef = user?.totalCollateralMarketReferenceCurrency || '0';
    if (valueToBigNumber(collateralRef).eq(0)) return 0;
    const borrowsRef = user?.totalBorrowsMarketReferenceCurrency || '0';
    return Number(valueToBigNumber(borrowsRef).div(collateralRef).toFixed());
  }, [user]);

  const { claimableRewardsUsd } = user
    ? Object.keys(user.calculatedUserIncentives).reduce(
      (acc, rewardTokenAddress) => {
        const incentive: UserIncentiveData = user.calculatedUserIncentives[rewardTokenAddress];
        const rewardBalance = normalize(
          incentive.claimableRewards,
          incentive.rewardTokenDecimals
        );

        let tokenPrice = 0;
        // getting price from reserves for the native rewards for v2 markets
        if (!currentMarketData.v3 && Number(rewardBalance) > 0) {
          if (currentMarketData.chainId === ChainId.mainnet) {
            const moreToken = reserves.find((reserve) => reserve.symbol === 'MORE');
            tokenPrice = moreToken ? Number(moreToken.priceInUSD) : 0;
          } else {
            reserves.forEach((reserve) => {
              if (reserve.symbol === currentNetworkConfig.wrappedBaseAssetSymbol) {
                tokenPrice = Number(reserve.priceInUSD);
              }
            });
          }
        } else {
          tokenPrice = Number(incentive.rewardPriceFeed);
        }

        const rewardBalanceUsd = Number(rewardBalance) * tokenPrice;

        if (rewardBalanceUsd > 0) {
          if (acc.assets.indexOf(incentive.rewardTokenSymbol) === -1) {
            acc.assets.push(incentive.rewardTokenSymbol);
          }

          acc.claimableRewardsUsd += Number(rewardBalanceUsd);
        }

        return acc;
      },
      { claimableRewardsUsd: 0, assets: [] } as { claimableRewardsUsd: number; assets: string[] }
    )
    : { claimableRewardsUsd: 0 };

  // Rewards summary (adapted from DashboardTopPanel)
  const userPoolRewardsQuery = useUserPoolReservesRewardsHumanized(currentMarketData);
  const distributedRewards = userPoolRewardsQuery?.data?.distributed || [];
  const accruingRewards = userPoolRewardsQuery?.data?.accruing || [];
  const lastAccruingUpdateAt = accruingRewards.reduce((max: number, r: UserAccruingReward) => {
    const updatedAt = Number(r?.updated_at || 0);
    return updatedAt > max ? updatedAt : max;
  }, 0);
  const lastAccruingUpdateAtDate = lastAccruingUpdateAt
    ? new Date(lastAccruingUpdateAt > 1e12 ? lastAccruingUpdateAt : lastAccruingUpdateAt * 1000)
    : undefined;
  const claimableRewardsUsdNew = distributedRewards.reduce((acc, r) => {
    const reserve = (reserves || []).find((res) => res.underlyingAsset.toLowerCase() === r.reward_token_address.toLowerCase());
    const decimals = reserve ? Number(reserve.decimals || 18) : 18;
    const price = reserve ? Number(reserve.priceInUSD || 0) : 0;
    const netTokens = valueToBigNumber(r.net_claimable_amount).dividedBy(valueToBigNumber(10).pow(decimals));
    return acc + netTokens.multipliedBy(price).toNumber();
  }, 0);
  const accruingRewardsUsdNew = accruingRewards.reduce((acc, r) => {
    const reserve = (reserves || []).find((res) => res.underlyingAsset.toLowerCase() === r.reward_token_address.toLowerCase());
    const decimals = reserve ? Number(reserve.decimals || 18) : 18;
    const price = reserve ? Number(reserve.priceInUSD || 0) : 0;
    const estTokens = valueToBigNumber(r.amount_wei_estimated).dividedBy(valueToBigNumber(10).pow(decimals));
    return acc + estTokens.multipliedBy(price).toNumber();
  }, 0);
  const totalClaimableUsd = claimableRewardsUsd + claimableRewardsUsdNew;

  const supplies: PositionRow[] = useMemo(() => {
    const data = user?.userReservesData || [];
    return data
      .filter((ur) => ur.underlyingBalance !== '0')
      .map((ur) => {
        const reserve = reserveByUnderlying.get(ur.reserve.underlyingAsset.toLowerCase());
        const baseApy = typeof ur.reserve.supplyAPY === 'number' ? ur.reserve.supplyAPY : parseFloat(String(ur.reserve.supplyAPY || 0));
        const rewards = rewardsByAddress.get((reserve?.underlyingAsset || '').toLowerCase());
        const incApr = sumIncentivesApr(reserve?.aIncentivesData);
        const rewApr = sumRewardsApr(rewards?.supply, 'supply');
        const effectiveApy = baseApy + incApr + rewApr;
        return {
          id: ur.reserve.underlyingAsset,
          assetSymbol: ur.reserve.symbol,
          assetName: ur.reserve.name,
          balance: parseFloat(ur.underlyingBalanceUSD || '0'),
          tokenBalance: parseFloat(ur.underlyingBalance || '0'),
          apy: baseApy,
          effectiveApy,
          reserve,
          rewardsSupply: rewards?.supply,
          lltv: Number(reserve?.formattedReserveLiquidationThreshold ?? 0),
          utilization: Number(reserve?.borrowUsageRatio ?? 0),
        } as PositionRow;
      });
  }, [user, reserveByUnderlying, rewardsByAddress]);

  const borrows: PositionRow[] = useMemo(() => {
    const data = user?.userReservesData || [];
    return data
      .filter((ur) => ur.variableBorrows !== '0' || ur.stableBorrows !== '0')
      .map((ur) => {
        const variableUsd = parseFloat(ur.variableBorrowsUSD || '0');
        const stableUsd = parseFloat(ur.stableBorrowsUSD || '0');
        const reserve = reserveByUnderlying.get(ur.reserve.underlyingAsset.toLowerCase());
        const baseApy = variableUsd > 0
          ? (typeof ur.reserve.variableBorrowAPY === 'number' ? ur.reserve.variableBorrowAPY : parseFloat(String(ur.reserve.variableBorrowAPY || 0)))
          : (typeof ur.reserve.stableBorrowAPY === 'number' ? ur.reserve.stableBorrowAPY : parseFloat(String(ur.reserve.stableBorrowAPY || 0)));
        const rewards = rewardsByAddress.get((reserve?.underlyingAsset || '').toLowerCase());
        const incApr = sumIncentivesApr(reserve?.vIncentivesData);
        const rewApr = sumRewardsApr(rewards?.borrow, 'borrow');
        const effectiveApy = baseApy + incApr + rewApr;
        return {
          id: ur.reserve.underlyingAsset,
          assetSymbol: ur.reserve.symbol,
          assetName: ur.reserve.name,
          balance: variableUsd + stableUsd,
          tokenBalance: parseFloat(ur.variableBorrows || '0') + parseFloat(ur.stableBorrows || '0'),
          apy: baseApy,
          effectiveApy,
          reserve,
          rewardsBorrow: rewards?.borrow,
          lltv: Number(reserve?.formattedReserveLiquidationThreshold ?? 0),
          utilization: Number(reserve?.borrowUsageRatio ?? 0),
        } as PositionRow;
      });
  }, [user, reserveByUnderlying, rewardsByAddress]);

  const eligibilityByAsset = useMemo(() => {
    const map = new Map<string, { disableSupply: boolean; disableBorrow: boolean; eModeBorrowDisabled?: boolean }>();
    (reserves || []).forEach((r) => {
      const asset = (r.underlyingAsset || '').toLowerCase();
      const balanceAmount = walletBalances?.[asset]?.amount || '0';

      const maxAmountToSupply = getMaxAmountAvailableToSupply(
        balanceAmount,
        r,
        r.underlyingAsset,
        minRemainingBaseTokenBalance
      ).toString();
      const disableSupply = !account || maxAmountToSupply === '0' || balanceAmount === '0';

      const isReserveAlreadySupplied = (user?.userReservesData || []).some(
        (ur) => ur.reserve.underlyingAsset === r.underlyingAsset && ur.underlyingBalance !== '0'
      );
      const userHasNoCollateralSupplied = user?.totalCollateralMarketReferenceCurrency === '0';
      const assetBorrowable = user ? assetCanBeBorrowedByUser(r, user) : false;
      const eModeBorrowDisabled = !!(user?.isInEmode && r.eModeCategoryId !== user.userEmodeCategoryId);
      const maxAmountToBorrow = user
        ? getMaxAmountAvailableToBorrow(r, user, InterestRate.Variable).toString()
        : '0';
      const disableBorrow =
        !account ||
        !assetBorrowable ||
        userHasNoCollateralSupplied ||
        isReserveAlreadySupplied ||
        maxAmountToBorrow === '0';

      map.set(r.underlyingAsset, { disableSupply, disableBorrow, eModeBorrowDisabled });
    });
    return map;
  }, [reserves, walletBalances, user, account, minRemainingBaseTokenBalance]);

  // Sort by balance desc to match the design's "biggest first" arrangement
  const sortedSupplies = useMemo(() => [...supplies].sort((a, b) => b.balance - a.balance), [supplies]);
  const sortedBorrows = useMemo(() => [...borrows].sort((a, b) => b.balance - a.balance), [borrows]);

  const onOpenSupplyRow = (row: PositionRow) => {
    if (!row.reserve) return;
    openSupply(row.reserve.underlyingAsset, currentMarket, row.assetName, 'dashboard');
    trackEvent(GENERAL.OPEN_MODAL, { modal: 'Supply', assetName: row.assetName });
  };
  const onWithdrawRow = (row: PositionRow) => {
    if (!row.reserve) return;
    openWithdraw(row.reserve.underlyingAsset, currentMarket, row.assetName, 'dashboard');
    trackEvent(GENERAL.OPEN_MODAL, { modal: 'Withdraw', assetName: row.assetName });
  };
  const onOpenBorrowRow = (row: PositionRow) => {
    if (!row.reserve) return;
    openBorrow(row.reserve.underlyingAsset, currentMarket, row.assetName, 'dashboard');
    trackEvent(GENERAL.OPEN_MODAL, { modal: 'Borrow', assetName: row.assetName });
  };
  const onRepayRow = (row: PositionRow) => {
    if (!row.reserve) return;
    openRepay(row.reserve.underlyingAsset, InterestRate.Variable, row.reserve.isFrozen, currentMarket, row.assetName, 'dashboard');
    trackEvent(GENERAL.OPEN_MODAL, { modal: 'Repay', assetName: row.assetName });
  };
  const onNavigateRow = (row: PositionRow) => {
    if (!row.reserve) return;
    window.location.href = `/markets/${row.reserve.underlyingAsset}`;
  };

  const hasPositionsOrRewards =
    supplies.length > 0 ||
    borrows.length > 0 ||
    totalClaimableUsd > 0 ||
    accruingRewardsUsdNew > 0;
  if (!hasPositionsOrRewards) return null;

  const netAPY = Number(user?.netAPY || 0);
  const isNetApyPositive = netAPY > 0;
  const healthFactor = Number(user?.healthFactor || 0);
  const hasHealthFactor = user?.healthFactor !== '-1';
  const hfColor =
    healthFactor >= 3 ? 'success.main' : healthFactor < 1.1 ? 'error.main' : 'warning.main';

  return (
    <Box
      sx={{
        background: isDark
          ? `radial-gradient(120% 140% at 85% -20%, rgba(245,132,32,.16), transparent 55%),
             linear-gradient(180deg, ${theme.palette.background.surface2}, ${theme.palette.background.surface})`
          : `radial-gradient(120% 140% at 85% -20%, rgba(245,132,32,.12), transparent 55%),
             linear-gradient(180deg, ${theme.palette.background.surface2}, ${theme.palette.background.paper})`,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,.10)' : 'rgba(40,25,15,.12)',
        borderRadius: '14px',
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,.04) inset, 0 30px 60px -30px rgba(0,0,0,.7)'
          : '0 1px 0 rgba(255,255,255,.9) inset, 0 18px 40px -20px rgba(120,70,20,.14)',
        px: { xs: 4, md: 8 },
        py: { xs: 4, md: 7 },
        mb: { xs: 4, md: 6 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top: eyebrow + Net Worth + (Health Factor / collapse) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: 2.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '10.5px',
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: 'text.muted',
              fontWeight: 500,
            }}
          >
            Your Positions · Markets
          </Typography>
          <Typography
            sx={{
              fontFamily: theme.typography.h1.fontFamily,
              fontSize: { xs: 28, md: 36 },
              fontWeight: 500,
              letterSpacing: '-.02em',
              lineHeight: 1.05,
              color: 'text.primary',
              mt: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Net worth $
            <FormattedNumber
              value={Number(user?.netWorthUSD || 0)}
              visibleDecimals={2}
              compact
              symbolsVariant="secondary21"
              sx={{
                fontFamily: theme.typography.h1.fontFamily,
                fontSize: { xs: 28, md: 36 },
                fontWeight: 500,
                letterSpacing: '-.02em',
                lineHeight: 1.05,
              }}
            />
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {hasHealthFactor && healthFactor > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Typography variant="secondary12" color="text.muted" sx={{ letterSpacing: '.04em' }}>
                HEALTH FACTOR
              </Typography>
              <FormattedNumber
                value={healthFactor}
                visibleDecimals={2}
                variant="main21"
                symbolsVariant="secondary16"
                color={hfColor}
                sx={{ fontWeight: 700, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}
              />
            </Box>
          )}
          <IconButton
            aria-label="Toggle My Positions"
            size="small"
            onClick={() => setMyPositionsOpen((p) => !p)}
            sx={{ color: 'text.muted' }}
          >
            {myPositionsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* KPI strip with vertical dividers */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
          py: { xs: 3, md: 4 },
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Net APY */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 1.5, md: 2.5 },
            py: { xs: 1, md: 0 },
          }}
        >
          <Typography sx={{ fontSize: 10, letterSpacing: '.10em', textTransform: 'uppercase', color: 'text.muted', fontWeight: 500 }}>
            Net APY
          </Typography>
          <FormattedNumber
            value={netAPY}
            percent
            visibleDecimals={2}
            sx={{
              fontFamily: theme.typography.h1.fontFamily,
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: '-.018em',
              lineHeight: 1.05,
              color: isNetApyPositive ? (isDark ? '#FFA94A' : '#C66A18') : 'text.primary',
              mt: 0.75,
            }}
            symbolsVariant="secondary14"
            symbolsColor={isNetApyPositive ? (isDark ? 'rgba(255,169,74,.7)' : 'rgba(198,106,24,.7)') : 'text.muted'}
          />
        </Box>

        {/* Total Supply */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 1.5, md: 2.5 },
            py: { xs: 1, md: 0 },
            borderLeft: { xs: 'none', sm: '1px solid' },
            borderColor: { xs: 'transparent', sm: 'divider' },
          }}
        >
          <Typography sx={{ fontSize: 10, letterSpacing: '.10em', textTransform: 'uppercase', color: 'text.muted', fontWeight: 500 }}>
            Total Supply
          </Typography>
          <FormattedNumber
            value={Number(user?.totalLiquidityUSD || 0)}
            symbol="USD"
            visibleDecimals={2}
            compact
            sx={{ fontSize: 18, fontWeight: 600, mt: 0.75, fontVariantNumeric: 'tabular-nums' }}
            symbolsVariant="secondary14"
          />
          <Typography variant="secondary12" color="text.muted" sx={{ mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
            {supplies.length} {supplies.length === 1 ? 'asset' : 'assets'}
          </Typography>
        </Box>

        {/* Total Borrow */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 1.5, md: 2.5 },
            py: { xs: 1, md: 0 },
            borderLeft: { xs: 'none', sm: '1px solid' },
            borderColor: { xs: 'transparent', sm: 'divider' },
          }}
        >
          <Typography sx={{ fontSize: 10, letterSpacing: '.10em', textTransform: 'uppercase', color: 'text.muted', fontWeight: 500 }}>
            Total Borrow
          </Typography>
          <FormattedNumber
            value={Number(user?.totalBorrowsUSD || 0)}
            symbol="USD"
            visibleDecimals={2}
            compact
            sx={{ fontSize: 18, fontWeight: 600, mt: 0.75, fontVariantNumeric: 'tabular-nums' }}
            symbolsVariant="secondary14"
          />
          <Typography variant="secondary12" color="text.muted" sx={{ mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
            {borrows.length} {borrows.length === 1 ? 'asset' : 'assets'}
          </Typography>
        </Box>

        {/* Available Rewards */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 1.5, md: 2.5 },
            py: { xs: 1, md: 0 },
            borderLeft: { xs: 'none', md: '1px solid' },
            borderColor: { xs: 'transparent', md: 'divider' },
          }}
        >
          <Typography sx={{ fontSize: 10, letterSpacing: '.10em', textTransform: 'uppercase', color: 'text.muted', fontWeight: 500 }}>
            Available Rewards
          </Typography>
          <FormattedNumber
            value={totalClaimableUsd}
            symbol="USD"
            visibleDecimals={2}
            compact
            sx={{ fontSize: 18, fontWeight: 600, mt: 0.75, fontVariantNumeric: 'tabular-nums' }}
            symbolsVariant="secondary14"
          />
          {totalClaimableUsd > 0 ? (
            <Box
              component="button"
              onClick={(e) => {
                e.stopPropagation();
                openClaimRewards();
              }}
              data-cy={'Dashboard_Claim_Button'}
              sx={{
                mt: 0.5,
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: '8px',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '.10em',
                color: isDark ? '#FFA94A' : '#C66A18',
                background: 'rgba(245,132,32,.14)',
                border: '1px solid rgba(245,132,32,.22)',
                cursor: 'pointer',
                fontFamily: theme.typography.fontFamily,
                '&:hover': { background: 'rgba(245,132,32,.18)' },
              }}
            >
              CLAIM →
            </Box>
          ) : (
            <Typography variant="secondary12" color="text.muted" sx={{ mt: 0.25 }}>
              —
            </Typography>
          )}
        </Box>

        {/* Accruing Rewards */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 1.5, md: 2.5 },
            py: { xs: 1, md: 0 },
            borderLeft: { xs: 'none', md: '1px solid' },
            borderColor: { xs: 'transparent', md: 'divider' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: 10, letterSpacing: '.10em', textTransform: 'uppercase', color: 'text.muted', fontWeight: 500 }}>
              Accruing Rewards
            </Typography>
            {accruingRewardsUsdNew > 0 && (
              <TextWithTooltip iconMargin={0}>
                <>
                  {accruingRewards.map((reward) => {
                    const reserve = reserves.find((r) => r.underlyingAsset.toLowerCase() === reward.reward_token_address.toLowerCase());
                    const decimals = reserve ? Number(reserve.decimals || 18) : 18;
                    return (
                      <Box key={reward.reward_token_address} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TokenIcon symbol={reserve?.symbol || ''} sx={{ fontSize: `12px`, ml: -1 }} />
                        <FormattedNumber
                          value={valueToBigNumber(reward.amount_wei_estimated).dividedBy(valueToBigNumber(10).pow(decimals)).toString()}
                          compact
                          toggleCompactOnClick
                          visibleDecimals={2}
                          symbol={reserve?.symbol || ''}
                          variant="secondary12"
                        />
                      </Box>
                    );
                  })}
                  {lastAccruingUpdateAtDate && (
                    <Typography variant="secondary12" color="text.main" pt={1}>
                      Last update: {lastAccruingUpdateAtDate.toLocaleString()}
                    </Typography>
                  )}
                </>
              </TextWithTooltip>
            )}
          </Box>
          <FormattedNumber
            value={accruingRewardsUsdNew}
            symbol="USD"
            visibleDecimals={2}
            compact
            sx={{ fontSize: 18, fontWeight: 600, mt: 0.75, fontVariantNumeric: 'tabular-nums' }}
            symbolsVariant="secondary14"
          />
          <Typography variant="secondary12" color="text.muted" sx={{ mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
            {accruingRewardsUsdNew > 0 ? 'estimated' : '—'}
          </Typography>
        </Box>
      </Box>

      <Collapse in={myPositionsOpen} timeout="auto" unmountOnExit>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 4, lg: 7 }, mt: 4 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Inline supplies header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography
                  sx={{
                    fontFamily: theme.typography.h1.fontFamily,
                    fontSize: 20,
                    fontWeight: 500,
                    letterSpacing: '-.018em',
                    lineHeight: 1.1,
                    color: 'text.primary',
                  }}
                >
                  My Supplies
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.5,
                    borderRadius: '8px',
                    background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(40,25,15,.04)',
                    border: '1px solid',
                    borderColor: 'divider',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <Typography component="span" sx={{ fontSize: 10, letterSpacing: '.10em', textTransform: 'uppercase', color: 'text.muted', fontWeight: 500 }}>
                    APY
                  </Typography>
                  <FormattedNumber value={Number(user?.earnedAPY || 0)} percent variant="secondary12" sx={{ fontWeight: 600 }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="secondary12" color="text.muted">Collateral</Typography>
                <FormattedNumber
                  value={Number(user?.totalCollateralUSD || 0)}
                  symbol="USD"
                  visibleDecimals={2}
                  compact
                  variant="secondary14"
                  sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {loading
                ? Array.from({ length: 2 }).map((_, i) => <PositionRowSkeleton key={i} />)
                : sortedSupplies.map((row) => (
                    <SupplyPositionRow
                      key={row.id}
                      row={row}
                      onSupply={onOpenSupplyRow}
                      onWithdraw={onWithdrawRow}
                      disableSupply={!!(row.reserve && eligibilityByAsset.get(row.reserve.underlyingAsset)?.disableSupply)}
                      onClick={onNavigateRow}
                    />
                  ))}
            </Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Inline borrows header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography
                  sx={{
                    fontFamily: theme.typography.h1.fontFamily,
                    fontSize: 20,
                    fontWeight: 500,
                    letterSpacing: '-.018em',
                    lineHeight: 1.1,
                    color: 'text.primary',
                  }}
                >
                  My Borrows
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.5,
                    borderRadius: '8px',
                    background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(40,25,15,.04)',
                    border: '1px solid',
                    borderColor: 'divider',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <Typography component="span" sx={{ fontSize: 10, letterSpacing: '.10em', textTransform: 'uppercase', color: 'text.muted', fontWeight: 500 }}>
                    APY
                  </Typography>
                  <FormattedNumber value={Number(user?.debtAPY || 0)} percent variant="secondary12" sx={{ fontWeight: 600 }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="secondary12" color="text.muted">LTV</Typography>
                  <FormattedNumber value={ltv} percent variant="secondary12" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="secondary12" color="text.muted">MOST Mode</Typography>
                <TextWithTooltip iconMargin={0.25}>
                  <>
                    MOST Mode increases your LTV for a selected category of assets up to 97%.{' '}
                    <Link
                      href="https://docs.more.markets/more-markets/editor-1/most-mode"
                      sx={{ textDecoration: 'underline' }}
                      variant="caption"
                      color="text.secondary"
                    >
                      Learn more
                    </Link>
                  </>
                </TextWithTooltip>
                <Switch
                  checked={(user?.userEmodeCategoryId || 0) !== 0}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    const isInEmode = (user?.userEmodeCategoryId || 0) !== 0;
                    if (isInEmode) {
                      openEmode(EmodeModalType.DISABLE);
                    } else {
                      openEmode(EmodeModalType.ENABLE);
                    }
                  }}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {loading
                ? Array.from({ length: 1 }).map((_, i) => <PositionRowSkeleton key={i} />)
                : sortedBorrows.map((row) => {
                    const eModeDisabled = !!(row.reserve && eligibilityByAsset.get(row.reserve.underlyingAsset)?.eModeBorrowDisabled);
                    const disableBorrow =
                      !row.reserve || !!(row.reserve && eligibilityByAsset.get(row.reserve.underlyingAsset)?.disableBorrow);
                    return (
                      <BorrowPositionRow
                        key={row.id}
                        row={row}
                        onBorrow={onOpenBorrowRow}
                        onRepay={onRepayRow}
                        disableBorrow={disableBorrow}
                        borrowDisabledReason={eModeDisabled ? 'In MOST Mode some assets are not borrowable. Exit MOST Mode to get access to all assets' : undefined}
                        onClick={onNavigateRow}
                      />
                    );
                  })}
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}


