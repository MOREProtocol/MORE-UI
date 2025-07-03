import { Box, Button, Skeleton, SvgIcon, Typography, useMediaQuery, useTheme } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import { useVault } from 'src/hooks/vault/useVault';
import { useMemo, useState } from 'react';
import { useUserVaultsData, useVaultData } from 'src/hooks/vault/useVaultData';
import { CompactMode } from 'src/components/CompactableTypography';
import { Address } from 'src/components/Address';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { useDepositWhitelist } from 'src/hooks/vault/useDepositWhitelist';
import { VaultWhitelistModal } from './VaultWhitelistModal';
import { VaultDepositModal } from './VaultDepositModal';
import { VaultWithdrawModal } from './VaultWithdrawModal';
import { LightweightLineChart } from '../vaults/LightweightLineChart';
import { MarketLogo } from 'src/components/MarketSwitcher';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { formatUnits } from 'viem';
import { formatTimeRemaining } from 'src/helpers/timeHelper';
import { useRouter } from 'next/router';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import BigNumber from 'bignumber.js';

export const VaultDetail = () => {
  const router = useRouter();
  const { reserves } = useAppDataContext();
  const { selectedVaultId, accountAddress, chainId } = useVault();
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const vaultData = useVaultData(selectedVaultId);
  const theme = useTheme();
  const downToMd = useMediaQuery(theme.breakpoints.down('md'));

  const baseUrl = useMemo(() => chainId && networkConfigs[chainId] && networkConfigs[chainId].explorerLink, [chainId]);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [selectedChartDataKey, setSelectedChartDataKey] = useState<'apy' | 'totalSupply'>('apy');

  // Get whitelist data from smart contract
  const { isWhitelisted, whitelistAmount, isWhitelistEnabled } = useDepositWhitelist();

  const selectedVault = vaultData?.data;
  const isLoading = vaultData?.isLoading;
  const maxWithdraw = userVaultData?.[0]?.data?.maxWithdraw;

  const reserve = useMemo(() => {
    return reserves.find((reserve) => reserve.underlyingAsset.toLowerCase() === selectedVault?.overview?.asset?.address?.toLowerCase());
  }, [reserves, selectedVault]);
  const aum = selectedVault
    ? BigInt(selectedVault?.financials?.liquidity?.totalAssets)
    : BigInt(0);
  const aumFormatted = selectedVault
    ? formatUnits(aum, selectedVault?.overview?.asset?.decimals || 18)
    : '0';
  const aumInUsd = new BigNumber(aumFormatted).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency || 0
  );

  const chartDataOptions = {
    apy: {
      label: 'APY',
      data: selectedVault?.overview?.historicalSnapshots?.apy || [],
    },
    totalSupply: {
      label: 'Total Supply',
      data: selectedVault?.overview?.historicalSnapshots?.totalSupply || [],
    },
  };

  const currentChartLabel = chartDataOptions[selectedChartDataKey]?.label || 'Share price';
  const currentChartData = chartDataOptions[selectedChartDataKey]?.data;

  const handleDepositClick = () => {
    // If whitelisting is not enabled, allow direct deposit
    if (!isWhitelistEnabled) {
      setIsDepositModalOpen(true);
    } else if (isWhitelisted) {
      // If whitelisting is enabled and user is whitelisted, allow deposit
      setIsDepositModalOpen(true);
    } else {
      // If whitelisting is enabled but user is not whitelisted, show whitelist modal
      setIsWhitelistModalOpen(true);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5, pt: 10 }}>
      {/* TOP DETAILS */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SvgIcon sx={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => router.push('/vaults')}>
            <ArrowBackRoundedIcon />
          </SvgIcon>
          {isLoading ? (
            <Skeleton width={150} height={30} />
          ) : (
            <Typography variant="main21">{selectedVault?.overview?.name}</Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'row', gap: 5 }}>
          {isLoading ? (
            <Skeleton width={150} height={20} />
          ) : selectedVault?.overview?.roles?.owner && (
            <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column' }}>
              <Typography variant="secondary14" sx={{ py: 2 }}>
                Owner
              </Typography>
              <Address
                address={selectedVault?.overview?.roles.owner}
                link={`${baseUrl}/address/${selectedVault?.overview?.roles.owner}`}
                loading={isLoading}
                isUser
                variant="secondary12"
                compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
              />
            </Box>
          )}
          {isLoading ? (
            <Skeleton width={150} height={20} />
          ) : selectedVault?.overview?.roles?.curator && (
            <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column' }}>
              <Typography variant="secondary14" sx={{ py: 2 }}>
                Curator
              </Typography>
              <Address
                address={selectedVault?.overview?.roles.curator}
                link={`${baseUrl}/address/${selectedVault?.overview?.roles.curator}`}
                loading={isLoading}
                isUser
                variant="secondary12"
                compactMode={CompactMode.SM}
              />
            </Box>
          )}
          {isLoading ? (
            <Skeleton width={150} height={20} />
          ) : selectedVault?.overview?.roles?.guardian && (
            <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column' }}>
              <Typography variant="secondary14" sx={{ py: 2 }}>
                Guardian
              </Typography>
              <Address
                address={selectedVault?.overview?.roles.guardian}
                link={`${baseUrl}/address/${selectedVault?.overview?.roles.guardian}`}
                loading={isLoading}
                isUser
                variant="secondary12"
                compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
              />
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'row', gap: 2 }}>
          <Button variant="gradient" color="primary" onClick={handleDepositClick}>
            Deposit
          </Button>
          {!isLoading && (maxWithdraw && maxWithdraw.gt(0)) && accountAddress &&
            <Button
              variant="gradient"
              size="medium"
              onClick={() => setIsWithdrawModalOpen(true)}
            >
              Withdraw
            </Button>
          }
        </Box>
      </Box>

      {/* MIDDLE DETAILS */}
      <Box sx={{
        display: 'flex',
        alignItems: 'left',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        mt: 4
      }}>
        {/* LEFT SIDE KPIS */}
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 2 }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            height: '100%',
            gap: 3,
            p: 3,
          }}>
            {/* Row 1 - Deposit Tokens */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Deposit Tokens
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isLoading ? <Skeleton width={80} height={24} /> :
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* TODO: add getDepositableTokens to SC */}
                    <TokenIcon symbol={vaultData?.data?.overview?.asset?.symbol || ''} fontSize="medium" />
                    <Typography variant="main16" fontWeight={600}>{vaultData?.data?.overview?.asset?.symbol || ''}</Typography>
                  </Box>
                }
              </Box>
            </Box>

            {/* Row 1 - Deposit Cap */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Deposit Cap
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isLoading ? <Skeleton width={80} height={24} /> : <FormattedNumber
                  value={formatUnits(
                    BigInt(vaultData?.data?.financials?.liquidity?.maxDeposit || '0'),
                    vaultData?.data?.overview?.asset?.decimals || 18
                  ) || ''}
                  symbol={vaultData?.data?.overview?.asset?.symbol || ''}
                  variant="main16"
                />}
              </Box>
            </Box>

            {/* Row 2 - Networks */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Networks
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {isLoading ? <Skeleton width={80} height={24} /> :
                  <>
                    <MarketLogo
                      size={24}
                      logo={networkConfigs[747].networkLogoPath} // TODO: change to vault network
                    />
                    <Typography variant="main16">FLOW EVM</Typography>
                  </>
                }
              </Box>
            </Box>

            {/* Row 2 - Available Liquidity */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Available Liquidity
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isLoading ? <Skeleton width={80} height={24} /> : <FormattedNumber
                  value={formatUnits(
                    BigInt(vaultData?.data?.financials?.liquidity?.totalAssets || '0'),
                    vaultData?.data?.overview?.asset?.decimals || 18
                  ) || ''}
                  symbol={vaultData?.data?.overview?.asset?.symbol || ''}
                  variant="main16"
                />}
              </Box>
            </Box>

            {/* Row 3 - Rebalance Timelock */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Rebalance Timelock
              </Typography>
              <Typography variant="main16" fontWeight={600}>
                {isLoading ? <Skeleton width={60} height={24} /> :
                  vaultData?.data?.overview?.withdrawalTimelock ?
                    formatTimeRemaining(Number(vaultData.data.overview.withdrawalTimelock)) :
                    'N/A'
                }
              </Typography>
            </Box>

            {/* Row 3 - Fee */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Fee
              </Typography>
              {isLoading ? <Skeleton width={60} height={24} /> : <FormattedNumber
                value={vaultData?.data?.overview?.fee || '0'}
                percent
                variant="main16"
              />}
            </Box>

            {/* Row 4 - Lifetime */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Lifetime
              </Typography>
              <Typography variant="main16" fontWeight={600}>
                {isLoading ? <Skeleton width={60} /> : 'N/A'}
              </Typography>
            </Box>

            {/* Row 4 - Risk Score */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Risk Score
              </Typography>
              <Typography variant="main16" fontWeight={600}>
                {isLoading ? <Skeleton width={60} /> : 'N/A'}
              </Typography>
            </Box>
          </Box>
        </Box>
        {/* RIGHT SIDE CHART */}
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 3, pt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'row', gap: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
              <Typography variant="secondary14" color="text.secondary">TVM</Typography>
              <FormattedNumber
                value={aumInUsd.toString() || '0'}
                symbol={'USD'}
                variant="main16"
                sx={{ fontWeight: 800 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
              <Typography variant="secondary14" color="text.secondary">APY</Typography>
              <FormattedNumber
                value={vaultData?.data?.overview?.apy || '0'}
                percent
                variant="main16"
                sx={{ fontWeight: 800 }}
              />
            </Box>
          </Box>
          {isLoading ? (
            <Skeleton variant="rectangular" width="100%" height={300} />
          ) : currentChartData && currentChartData.length > 0 ? (
            <LightweightLineChart
              height={300}
              data={currentChartData}
            />
          ) : (
            <Typography sx={{ textAlign: 'center', pt: 5 }}>
              No historical data available for {currentChartLabel}.
            </Typography>
          )}
        </Box>
      </Box>

      {/* BOTTOM TABS */}

      {/* MODALS */}
      <VaultDepositModal
        isOpen={isDepositModalOpen}
        setIsOpen={setIsDepositModalOpen}
        whitelistAmount={whitelistAmount}
      />
      <VaultWithdrawModal isOpen={isWithdrawModalOpen} setIsOpen={setIsWithdrawModalOpen} />
      <VaultWhitelistModal isOpen={isWhitelistModalOpen} setIsOpen={setIsWhitelistModalOpen} />
    </Box>
  );
};