import { valueToBigNumber } from '@aave/math-utils';
import { ExternalLinkIcon, LockClosedIcon } from '@heroicons/react/outline';
import { Box, Button, SvgIcon, Typography, useMediaQuery, useTheme } from '@mui/material';
import * as React from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { Link, ROUTES } from 'src/components/primitives/Link';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { ConnectWalletButton } from 'src/components/WalletConnection/ConnectWalletButton';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useWalletBalances } from 'src/hooks/app-data-provider/useWalletBalances';
import { useModalContext } from 'src/hooks/useModal';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { ExtendedMarket } from 'src/store/protocolDataSlice';
import { useRootStore } from 'src/store/root';
import { FONT_DISPLAY } from 'src/utils/theme';

import { FaucetEmptyState } from './FaucetEmptyState';
import { FAUCET_ROW_SX, FaucetItemLoader } from './FaucetItemLoader';

const EyebrowLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'text.secondary',
    }}
  >
    {children}
  </Typography>
);

const FaucetRowItem = ({
  reserve,
  currentMarket,
  hasFaucet,
  onFaucet,
}: {
  reserve: ReturnType<typeof useAppDataContext>['reserves'][number] & {
    walletBalance: ReturnType<typeof valueToBigNumber>;
  };
  currentMarket: ExtendedMarket;
  hasFaucet: boolean;
  onFaucet: (underlyingAsset: string) => void;
}) => {
  return (
    <Box
      data-cy={`faucetListItem_${reserve.symbol.toUpperCase()}`}
      sx={{
        ...FAUCET_ROW_SX,
        p: { xs: 2.5, sm: 3 },
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: { xs: 2, sm: 3 },
      }}
    >
      <Link
        href={ROUTES.reserveOverview(reserve.underlyingAsset, currentMarket)}
        noWrap
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1.5,
          flex: 1,
          minWidth: 0,
        }}
      >
        <TokenIcon symbol={reserve.iconSymbol} sx={{ fontSize: 36, flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            noWrap
            sx={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              fontSize: 16,
              lineHeight: 1.3,
              color: 'text.primary',
            }}
          >
            {reserve.name}
          </Typography>
          <Typography variant="secondary12" sx={{ color: 'text.secondary' }} noWrap>
            {reserve.symbol}
          </Typography>
        </Box>
      </Link>

      <Box sx={{ minWidth: { sm: 140 } }}>
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, mb: 0.5 }}>
          <EyebrowLabel>Wallet balance</EyebrowLabel>
        </Box>
        <FormattedNumber
          compact
          value={reserve.walletBalance.toString()}
          variant="main16"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Box sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}>
        {!hasFaucet ? (
          <Button
            href="https://faucet.circle.com/"
            component={Link}
            variant="outlined"
            endIcon={
              <SvgIcon sx={{ width: 14, height: 14 }}>
                <ExternalLinkIcon />
              </SvgIcon>
            }
            sx={{ width: { xs: '100%', sm: 'auto' }, borderRadius: '9999px' }}
          >
            Faucet
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={() => onFaucet(reserve.underlyingAsset)}
            sx={{ width: { xs: '100%', sm: 'auto' }, borderRadius: '9999px' }}
          >
            Faucet
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default function FaucetAssetsList() {
  const { reserves, loading } = useAppDataContext();
  const { openFaucet } = useModalContext();
  const { currentAccount, loading: web3Loading } = useWeb3Context();
  const currentMarket = useRootStore((store) => store.currentMarket);
  const currentMarketData = useRootStore((store) => store.currentMarketData);
  const { walletBalances } = useWalletBalances(currentMarketData);

  const theme = useTheme();
  const downToXSM = useMediaQuery(theme.breakpoints.down('xsm'));

  const listData = reserves
    .filter(
      (reserve) => !reserve.isWrappedBaseAsset && !reserve.isFrozen && reserve.symbol !== 'GHO'
    )
    .map((reserve) => {
      const walletBalance = valueToBigNumber(
        walletBalances[reserve.underlyingAsset]?.amount || '0'
      );
      return {
        ...reserve,
        walletBalance,
      };
    });

  if (!currentAccount || web3Loading) {
    return (
      <Box sx={{ ...FAUCET_ROW_SX, borderRadius: '20px' }}>
        <FaucetEmptyState
          icon={LockClosedIcon}
          title="Connect your wallet"
          description="Please connect your wallet to get free testnet assets."
          action={!web3Loading && <ConnectWalletButton />}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          gap: 3,
          px: 3,
          pb: 1.5,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <EyebrowLabel>Asset</EyebrowLabel>
        </Box>
        <Box sx={{ minWidth: 140 }}>
          <EyebrowLabel>Wallet balance</EyebrowLabel>
        </Box>
        <Box sx={{ minWidth: 100 }} />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {loading
          ? Array.from({ length: downToXSM ? 3 : 5 }).map((_, i) => (
              <FaucetItemLoader key={`faucet-skel-${i}`} />
            ))
          : listData.map((reserve) => (
              <FaucetRowItem
                key={reserve.symbol}
                reserve={reserve}
                currentMarket={currentMarket}
                hasFaucet={!!currentMarketData.addresses.FAUCET}
                onFaucet={openFaucet}
              />
            ))}
      </Box>
    </Box>
  );
}
