import { Box, Button, IconButton, Skeleton, SvgIcon, Tooltip, Typography, Menu, MenuItem } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';
import { useAppDataContext, ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { TokenIconAddDropdown } from 'src/modules/reserve-overview/TokenIconAddDropdown';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useModalContext } from 'src/hooks/useModal';
import { API_ETH_MOCK_ADDRESS } from '@aave/contract-helpers';
import { SupplyInfo } from 'src/modules/reserve-overview/SupplyInfo';
import { BorrowInfo } from 'src/modules/reserve-overview/BorrowInfo';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { AssetCapsProvider, useAssetCaps } from 'src/hooks/useAssetCaps';
import { InterestRateModelGraphContainer } from 'src/modules/reserve-overview/graphs/InterestRateModelGraphContainer';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { CollateralUsage } from 'src/modules/reserve-overview/CollateralUsage';
import { CollateralUsageHeader } from 'src/modules/reserve-overview/CollateralUsageHeader';

export default function ReserveOverview() {
  const router = useRouter();
  const { reserves } = useAppDataContext();
  const { currentMarketData, currentNetworkConfig, currentMarket, currentChainId } = useProtocolDataContext();
  const { currentAccount, addERC20Token, switchNetwork, chainId: connectedChainId } = useWeb3Context();
  const { openSupply, openBorrow } = useModalContext();
  const trackEvent = useRootStore((store) => store.trackEvent);
  const [supplyMenuAnchor, setSupplyMenuAnchor] = useState<null | HTMLElement>(null);

  const underlyingAsset = (router.query.underlyingAsset as string) || (router.query.vaultId as string) || (router.query.asset as string);

  const reserve = reserves.find((r) => r.underlyingAsset === underlyingAsset) as ComputedReserveData | undefined;

  const [pageEventCalled, setPageEventCalled] = useState(false);

  useEffect(() => {
    if (!pageEventCalled && reserve && reserve.iconSymbol && underlyingAsset) {
      trackEvent('Page Viewed', {
        'Page Name': 'Reserve Overview',
        Reserve: reserve.iconSymbol,
        Asset: underlyingAsset,
      });
      setPageEventCalled(true);
    }
  }, [trackEvent, reserve, underlyingAsset, pageEventCalled]);



  const TopBar = useMemo(() => (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
      backgroundColor: 'background.surface', p: 3, borderRadius: 2
    }}>
      {/* Left: Back + Asset */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <SvgIcon sx={{ fontSize: '20px', cursor: 'pointer', color: 'primary.main', '&:hover': { color: 'primary.light' } }} onClick={() => router.push('/markets')}>
          <ArrowBackRoundedIcon />
        </SvgIcon>
        {reserve ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <TokenIconAddDropdown
              reserve={reserve}
              switchNetwork={switchNetwork}
              addERC20Token={addERC20Token}
              currentChainId={currentChainId}
              connectedChainId={connectedChainId}
            />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="main21" sx={{ color: 'primary.main' }}>{reserve.name}</Typography>
                <Tooltip title="View token contract" placement="top" arrow>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const url = currentNetworkConfig.explorerLinkBuilder({ address: reserve.underlyingAsset });
                      window.open(url, '_blank');
                    }}
                    aria-label="open in explorer"
                    sx={{ padding: '2px' }}
                  >
                    <OpenInNewIcon sx={{ fontSize: '0.875rem' }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Tooltip title="Oracle price" placement="bottom" arrow>
                <Box component="span" sx={{ display: 'inline-flex' }}>
                  <UsdChip value={Number(reserve.priceInUSD || 0)} textVariant="secondary12" />
                </Box>
              </Tooltip>
            </Box>

          </Box>
        ) : (
          <Skeleton width={150} height={40} sx={{ my: 2 }} />
        )}
      </Box>

      {/* Right: Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        {currentAccount && reserve && (
          <>
            {reserve.isWrappedBaseAsset ? (
              <>
                <Button
                  variant="gradient"
                  color="primary"
                  onClick={(e) => setSupplyMenuAnchor(e.currentTarget)}
                >
                  Supply
                </Button>
                <Menu
                  anchorEl={supplyMenuAnchor}
                  open={Boolean(supplyMenuAnchor)}
                  onClose={() => setSupplyMenuAnchor(null)}
                  PaperProps={{ sx: { minWidth: 'unset', width: 'auto' } }}
                  anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                  transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                >
                  <MenuItem
                    onClick={() => {
                      openSupply(API_ETH_MOCK_ADDRESS.toLowerCase(), currentMarket, reserve.name, 'reserve-page', true);
                      setSupplyMenuAnchor(null);
                    }}
                  >
                    {`Supply ${currentNetworkConfig.baseAssetSymbol}`}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      openSupply(reserve.underlyingAsset, currentMarket, reserve.name, 'reserve-page', true);
                      setSupplyMenuAnchor(null);
                    }}
                  >
                    {`Supply ${reserve.symbol}`}
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="gradient"
                color="primary"
                onClick={() => openSupply(reserve.underlyingAsset, currentMarket, reserve.name, 'reserve-page', true)}
              >
                Supply
              </Button>
            )}
            {reserve.borrowingEnabled && (
              <Button
                variant="gradient"
                color="primary"
                onClick={() => openBorrow(reserve.underlyingAsset, currentMarket, reserve.name, 'reserve-page', true)}
              >
                Borrow
              </Button>
            )}
          </>
        )}
      </Box>
    </Box>
  ), [reserve, currentAccount, openSupply, openBorrow, currentMarket, connectedChainId, currentChainId, currentNetworkConfig, supplyMenuAnchor]);

  if (!reserve) return null;

  return (
    <AssetCapsProvider asset={reserve}>
      <Box sx={{
        mt: { xs: 2, md: 3 },
        px: { xs: 2, sm: 4, md: 6 },
        pb: { xs: 4, md: 8 },
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}>
        {TopBar}

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 4
        }}>
          {/* Left column: Supply & Borrow panels */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <SupplyPanel />
            <BorrowPanel />
          </Box>

          {/* Right column: Collateral usage & Interest rate model */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box sx={{
              backgroundColor: 'background.paper',
              borderRadius: 2,
              p: 3
            }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography sx={{
                  typography: { xs: 'main16', md: 'main19' }
                }}>
                  Collateral usage
                </Typography>
                <CollateralUsageHeader reserve={reserve} />
              </Box>
              <CollateralUsage reserve={reserve as ComputedReserveData} />
            </Box>

            <Box sx={{
              backgroundColor: 'background.paper',
              borderRadius: 2,
              p: 3
            }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                }}
              >
                <Typography sx={{
                  typography: { xs: 'main16', md: 'main19' },
                }}>
                  Interest rate model
                </Typography>
              </Box>
              <InterestRateModelGraphContainer reserve={reserve} />
            </Box>
          </Box>
        </Box>
      </Box>
    </AssetCapsProvider>
  );

  function SupplyPanel() {
    const { supplyCap, debtCeiling } = useAssetCaps();
    return (
      <Box sx={{ backgroundColor: 'background.paper', borderRadius: 2, p: 3 }}>
        <Typography sx={{
          typography: { xs: 'main16', md: 'main19' },
        }}>
          Supply Info
        </Typography>
        <SupplyInfo
          reserve={reserve as ComputedReserveData}
          currentMarketData={currentMarketData}
          showSupplyCapStatus={(reserve as ComputedReserveData).supplyCap !== '0'}
          supplyCap={supplyCap}
          debtCeiling={debtCeiling}
        />
      </Box>
    );
  }

  function BorrowPanel() {
    const { borrowCap } = useAssetCaps();
    return (
      <Box sx={{ backgroundColor: 'background.paper', borderRadius: 2, p: 3 }}>
        <Typography sx={{
          typography: { xs: 'main16', md: 'main19' },
        }}>
          Borrow Info
        </Typography>
        <BorrowInfo
          reserve={reserve as ComputedReserveData}
          currentMarketData={currentMarketData}
          currentNetworkConfig={currentNetworkConfig}
          showBorrowCapStatus={(reserve as ComputedReserveData).borrowCap !== '0'}
          borrowCap={borrowCap}
        />
      </Box>
    );
  }
}

ReserveOverview.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
