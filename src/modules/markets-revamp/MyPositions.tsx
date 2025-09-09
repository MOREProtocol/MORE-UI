import { Box, Button, IconButton, Typography, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useMemo, useState } from 'react';
import { normalize, UserIncentiveData, valueToBigNumber } from '@aave/math-utils';
import { UserAccruingReward, useUserPoolReservesRewardsHumanized } from 'src/hooks/pool/useUserPoolReservesRewards';
import { BaseDataGrid, ColumnDefinition } from 'src/components/primitives/DataGrid';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { IncentivesCard } from 'src/components/incentives/IncentivesCard';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { PositionRow } from './types';
import { useReserveMap, useRewardsMaps, sumIncentivesApr, sumRewardsApr } from './hooks';
import { useModalContext } from 'src/hooks/useModal';
import { ChainId, InterestRate } from '@aave/contract-helpers';
import { useRootStore } from 'src/store/root';
import { GENERAL } from 'src/utils/mixPanelEvents';
import { TextWithTooltip } from 'src/components/TextWithTooltip';

export function MyPositions() {
  const { user, loading, reserves } = useAppDataContext();
  const [myPositionsOpen, setMyPositionsOpen] = useState(true);
  const [headerHovered, setHeaderHovered] = useState(false);
  const reserveByUnderlying = useReserveMap();
  const { rewardsByAddress } = useRewardsMaps();
  const { openSupply, openWithdraw, openBorrow, openRepay, openClaimRewards } = useModalContext();
  const { currentMarket, trackEvent, currentMarketData, currentNetworkConfig } = useRootStore();
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

  const supplyColumns: ColumnDefinition<PositionRow>[] = useMemo(() => [
    {
      key: 'assetName',
      label: 'Asset',
      sortable: true,
      render: (row) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          justifyContent: { xs: 'flex-end', md: 'flex-start' },
          flexDirection: { xs: 'row-reverse', md: 'row' }
        }}>
          {row.reserve && <TokenIcon symbol={row.reserve.iconSymbol} fontSize="large" />}
          <Box>
            <Typography variant="subheader1" sx={{ textAlign: { xs: 'right', md: 'left' } }}>{row.assetName}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: { xs: 'right', md: 'left' } }}>{row.assetSymbol}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      sortable: true,
      render: (row) => (
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'row', md: 'column' },
          alignItems: { xs: 'center', md: 'start' },
          gap: { xs: 1.5, md: 0 }
        }}>
          <FormattedNumber compact value={row.tokenBalance} variant="secondary14" />
          <UsdChip value={row.balance} textVariant="secondary12" />
        </Box>
      ),
    },
    {
      key: 'effectiveApy',
      label: 'APY',
      sortable: true,
      render: (row) => (
        <IncentivesCard
          symbol={row.assetSymbol}
          value={row.apy}
          incentives={row.reserve?.aIncentivesData}
          rewards={row.rewardsSupply}
          variant="secondary14"
          symbolsVariant="secondary14"
          align="flex-start"
        />
      ),
    },
  ], []);

  const borrowColumns: ColumnDefinition<PositionRow>[] = useMemo(() => [
    {
      key: 'assetName',
      label: 'Asset',
      sortable: true,
      render: (row) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          justifyContent: { xs: 'flex-end', md: 'flex-start' },
          flexDirection: { xs: 'row-reverse', md: 'row' }
        }}>
          {row.reserve && <TokenIcon symbol={row.reserve.iconSymbol} fontSize="large" />}
          <Box>
            <Typography variant="subheader1" sx={{ textAlign: { xs: 'right', md: 'left' } }}>{row.assetName}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: { xs: 'right', md: 'left' } }}>{row.assetSymbol}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'balance',
      label: 'Debt',
      sortable: true,
      render: (row) => (
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'row', md: 'column' },
          alignItems: { xs: 'center', md: 'start' },
          gap: { xs: 1.5, md: 0 }
        }}>
          <FormattedNumber compact value={row.tokenBalance} variant="secondary14" />
          <UsdChip value={row.balance} textVariant="secondary12" />
        </Box>
      ),
    },
    {
      key: 'effectiveApy',
      label: 'Borrow Rate',
      sortable: true,
      render: (row) => (
        <IncentivesCard
          symbol={row.assetSymbol}
          value={row.apy}
          incentives={row.reserve?.vIncentivesData}
          rewards={row.rewardsBorrow}
          variant="secondary14"
          symbolsVariant="secondary14"
          align="flex-start"
        />
      ),
    },
    {
      key: 'lltv',
      label: 'LLTV',
      sortable: true,
      render: (row) => (
        <FormattedNumber
          value={Number(row.reserve?.formattedReserveLiquidationThreshold ?? 0)}
          percent
          variant="secondary14"
          symbolsVariant="secondary14"
        />
      ),
    },
    {
      key: 'utilization',
      label: 'Utilization',
      sortable: true,
      render: (row) => (
        <FormattedNumber
          value={Number(row.utilization ?? row.reserve?.borrowUsageRatio ?? 0)}
          percent
          variant="secondary14"
          symbolsVariant="secondary14"
        />
      ),
    },
  ], []);

  const hasPositions = supplies.length > 0 || borrows.length > 0;
  if (!hasPositions) return null;

  return (
    <Box
      sx={{
        backgroundColor: headerHovered ? 'background.surface2' : (myPositionsOpen ? 'background.surface3' : 'background.surface'),
        p: 3,
        borderRadius: 2,
        mb: { xs: 4, md: 6 }
      }}
    >
      <Box
        onClick={() => setMyPositionsOpen((p) => !p)}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          gap: { xs: 3, md: 0 },
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ typography: { xs: 'main16', md: 'main21' }, color: 'primary.main' }}>
            My positions
          </Typography>
          <IconButton aria-label="Toggle My Positions" size="small">
            {myPositionsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: { xs: 'space-between', md: 'flex-start' },
            gap: { xs: 3, md: 5 },
            flexWrap: 'wrap'
          }}>
          <Box>
            <Typography variant="secondary14" color="text.secondary">Net worth</Typography>
            <FormattedNumber
              value={Number(user?.netWorthUSD || 0)}
              symbol="USD"
              variant="main16"
              visibleDecimals={2}
              compact
              symbolsVariant="secondary16"
              sx={{ fontWeight: 800 }}
            />
          </Box>
          <Box>
            <Typography variant="secondary14" color="text.secondary">Net APY</Typography>
            <FormattedNumber
              value={Number(user?.netAPY || 0)}
              percent
              variant="main16"
              symbolsVariant="secondary16"
              sx={{ fontWeight: 800 }}
            />
          </Box>
          {user?.healthFactor !== '-1' && (
            <Box>
              <Typography variant="secondary14" color="text.secondary">Health factor</Typography>
              <FormattedNumber
                value={Number(user?.healthFactor || 0)}
                variant="main16"
                symbolsVariant="secondary16"
                color={Number(user?.healthFactor || 0) >= 3 ? 'success.main' : Number(user?.healthFactor || 0) < 1.1 ? 'error.main' : 'warning.main'}
                sx={{ fontWeight: 800 }}
              />
            </Box>
          )}
          {totalClaimableUsd > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="secondary14" color="text.secondary">Available rewards</Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }} data-cy={'Claim_Box'}>
                  <FormattedNumber
                    value={totalClaimableUsd}
                    variant='main16'
                    visibleDecimals={2}
                    compact
                    symbol="USD"
                    symbolsVariant='secondary16'
                    sx={{ fontWeight: 800 }}
                  />
                </Box>

                <Button
                  variant="gradient"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    openClaimRewards();
                  }}
                  sx={{ minWidth: 'unset', ml: { xs: 0, xsm: 2 } }}
                  data-cy={'Dashboard_Claim_Button'}
                >
                  Claim
                </Button>
              </Box>
            </Box>
          )}
          {accruingRewardsUsdNew > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="secondary14" color="text.secondary">
                  Accruing rewards
                </Typography>
                <TextWithTooltip iconMargin={0.5}>
                  <>
                    {accruingRewards.map((reward) => {
                      const reserve = reserves.find((reserve) => reserve.underlyingAsset.toLowerCase() === reward.reward_token_address.toLowerCase());
                      const decimals = reserve ? Number(reserve.decimals || 18) : 18;
                      return (
                        <Box key={reward.reward_token_address} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TokenIcon
                            symbol={reserve?.symbol || ''}
                            sx={{ fontSize: `12px`, ml: -1 }}
                          />
                          <FormattedNumber
                            value={valueToBigNumber(reward.amount_wei_estimated).dividedBy(valueToBigNumber(10).pow(decimals)).toString()}
                            compact
                            visibleDecimals={2}
                            symbol={reserve?.symbol || ''}
                            variant="secondary12"
                          />
                        </Box>
                      )
                    })}
                    {lastAccruingUpdateAtDate && (
                      <Typography variant="secondary12" color="text.main" pt={1}>
                        Last update: {lastAccruingUpdateAtDate.toLocaleString()}
                      </Typography>
                    )}
                  </>
                </TextWithTooltip>
              </Box>
              <FormattedNumber
                value={accruingRewardsUsdNew}
                variant='main16'
                visibleDecimals={2}
                compact
                symbol="USD"
                symbolsVariant='secondary16'
                sx={{ fontWeight: 800 }}
              />
            </Box>
          )}
        </Box>
      </Box>

      <Collapse in={myPositionsOpen} timeout="auto" unmountOnExit>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 5, mt: 5 }}>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'background.surface',
              p: 3,
              borderRadius: 2,
              mb: { xs: 4, md: 6 }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    typography: { xs: 'main16', md: 'main21' },
                    textAlign: { xs: 'center', md: 'left' },
                    color: 'primary.main'
                  }}
                >
                  My supplies
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: { xs: 2, md: 5 } }}>
                <Box>
                  <Typography variant="secondary14" color="text.secondary">
                    Balance
                  </Typography>
                  <FormattedNumber
                    value={Number(user?.totalLiquidityUSD || 0)}
                    symbol="USD"
                    variant="main16"
                    visibleDecimals={2}
                    compact
                    symbolsVariant="secondary16"
                    sx={{ fontWeight: 800 }}
                  />
                </Box>
                <Box>
                  <Typography variant="secondary14" color="text.secondary">
                    APY
                  </Typography>
                  <FormattedNumber
                    value={Number(user?.earnedAPY || 0)}
                    percent
                    variant="main16"
                    symbolsVariant="secondary16"
                    sx={{ fontWeight: 800 }}
                  />
                </Box>
                <Box>
                  <Typography variant="secondary14" color="text.secondary">
                    Collateral
                  </Typography>
                  <FormattedNumber
                    value={Number(user?.totalCollateralUSD || 0)}
                    symbol="USD"
                    variant="main16"
                    visibleDecimals={2}
                    compact
                    symbolsVariant="secondary16"
                    sx={{ fontWeight: 800 }}
                  />
                </Box>
              </Box>
            </Box>
            <Collapse in={myPositionsOpen} timeout="auto" unmountOnExit>
              <BaseDataGrid<PositionRow>
                data={supplies}
                columns={supplyColumns}
                loading={loading}
                minWidth={500}
                defaultSortColumn={'balance'}
                defaultSortOrder={'desc'}
                actionColumn={{
                  render: (row) => (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'stretch', md: 'flex-end' }, width: '100%' }}>
                      <Button
                        size="medium"
                        variant="gradient"
                        sx={{ width: { xs: '100%', md: 'auto' } }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (row.reserve) openSupply(row.reserve.underlyingAsset, currentMarket, row.assetName, 'dashboard');
                          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Supply', assetName: row.assetName });
                        }}
                      >
                        Supply
                      </Button>
                      <Button
                        size="medium"
                        variant="outlined"
                        sx={{ width: { xs: '100%', md: 'auto' } }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (row.reserve) openWithdraw(row.reserve.underlyingAsset, currentMarket, row.assetName, 'dashboard');
                          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Withdraw', assetName: row.assetName });
                        }}
                      >
                        Withdraw
                      </Button>
                    </Box>
                  ),
                }}
                rowIdGetter={(row) => row.id}
                onRowClick={(row) => {
                  if (row.reserve) {
                    window.location.href = `/markets/${row.reserve.underlyingAsset}`;
                  }
                }}
              />
            </Collapse>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'background.surface',
              p: 3,
              borderRadius: 2,
              mb: { xs: 4, md: 6 }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    typography: { xs: 'main16', md: 'main21' },
                    textAlign: { xs: 'center', md: 'left' },
                    color: 'primary.main'
                  }}
                >
                  My borrows
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: { xs: 2, md: 5 } }}>
                <Box>
                  <Typography variant="secondary14" color="text.secondary">
                    Balance
                  </Typography>
                  <FormattedNumber
                    value={Number(user?.totalBorrowsUSD || 0)}
                    symbol="USD"
                    variant="main16"
                    visibleDecimals={2}
                    compact
                    symbolsVariant="secondary16"
                    sx={{ fontWeight: 800 }}
                  />
                </Box>
                <Box>
                  <Typography variant="secondary14" color="text.secondary">
                    APY
                  </Typography>
                  <FormattedNumber
                    value={Number(user?.debtAPY || 0)}
                    percent
                    variant="main16"
                    symbolsVariant="secondary16"
                    sx={{ fontWeight: 800 }}
                  />
                </Box>
                <Box>
                  <Typography variant="secondary14" color="text.secondary">
                    LTV
                  </Typography>
                  <FormattedNumber
                    value={ltv}
                    percent
                    variant="main16"
                    symbolsVariant="secondary16"
                    sx={{ fontWeight: 800 }}
                  />
                </Box>
              </Box>
            </Box>
            <Collapse in={myPositionsOpen} timeout="auto" unmountOnExit>
              <BaseDataGrid<PositionRow>
                data={borrows}
                columns={borrowColumns}
                loading={loading}
                minWidth={500}
                defaultSortColumn={'balance'}
                defaultSortOrder={'desc'}
                actionColumn={{
                  render: (row) => (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'stretch', md: 'flex-end' }, width: '100%' }}>
                      <Button
                        size="medium"
                        variant="gradient"
                        sx={{ width: { xs: '100%', md: 'auto' } }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (row.reserve) openBorrow(row.reserve.underlyingAsset, currentMarket, row.assetName, 'dashboard');
                          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Borrow', assetName: row.assetName });
                        }}
                      >
                        Borrow
                      </Button>
                      <Button
                        size="medium"
                        variant="outlined"
                        sx={{ width: { xs: '100%', md: 'auto' } }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (row.reserve) {
                            openRepay(row.reserve.underlyingAsset, InterestRate.Variable, row.reserve.isFrozen, currentMarket, row.assetName, 'dashboard');
                          }
                          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Repay', assetName: row.assetName });
                        }}
                      >
                        Repay
                      </Button>
                    </Box>
                  ),
                }}
                rowIdGetter={(row) => row.id}
                onRowClick={(row) => {
                  if (row.reserve) {
                    window.location.href = `/markets/${row.reserve.underlyingAsset}`;
                  }
                }}
              />
            </Collapse>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}


