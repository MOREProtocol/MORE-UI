import { CreditCardIcon, ExternalLinkIcon } from '@heroicons/react/outline';
import { Box, Button, SvgIcon, Typography } from '@mui/material';
import { useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { useCryptoBuyAvailable } from 'src/hooks/useCryptoBuyAvailable';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { onRampServices } from 'src/ui-config/onRampServicesConfig';
import { GENERAL } from 'src/utils/mixPanelEvents';

type BuyWithFiatModalProps = {
  cryptoSymbol: string;
  open: boolean;
  close: () => void;
};

export const BuyWithFiatModal = ({ cryptoSymbol, open, close }: BuyWithFiatModalProps) => {
  const { currentAccount: walletAddress } = useWeb3Context();
  const trackEvent = useRootStore((store) => store.trackEvent);
  const {
    currentNetworkConfig: { name: network },
  } = useProtocolDataContext();

  return (
    <BasicModal open={open} setOpen={close}>
      <Typography variant="h2">Buy Crypto with Fiat</Typography>
      <Typography sx={{ my: 6 }}>
        {onRampServices.length && onRampServices.length === 1
          ? `${onRampServices[0].name} on-ramp service is provided by External Provider and by
            selecting you agree to Terms of the Provider. Your access to the service might be
            reliant on the External Provider being operational.`
          : 'Choose one of the on-ramp services'}
      </Typography>
      <Box>
        {onRampServices.map(({ name, makeLink, icon }) => (
          <Button
            key={name}
            variant="outlined"
            size="large"
            endIcon={
              <SvgIcon>
                <ExternalLinkIcon />
              </SvgIcon>
            }
            fullWidth
            sx={{ px: 4, '&:not(:first-of-type)': { mt: 4 } }}
            href={makeLink({ cryptoSymbol, network, walletAddress })}
            target="_blank"
            rel="noopener"
            onClick={() =>
              trackEvent(GENERAL.BUY_WITH_FIAT, {
                token: cryptoSymbol,
                network,
                onrampname: onRampServices[0].name,
              })
            }
          >
            <Box sx={{ display: 'flex', flexGrow: 1 }}>
              <SvgIcon sx={{ mr: 2 }}>{icon}</SvgIcon>
              <>
                {onRampServices.length === 1 ? 'Continue with ' : null}
                {name}
              </>
            </Box>
          </Button>
        ))}
      </Box>
    </BasicModal>
  );
};

type BuyWithFiatProps = {
  cryptoSymbol: string;
  networkMarketName: string;
  funnel?: string;
};

export const BuyWithFiat = ({ cryptoSymbol, networkMarketName, funnel }: BuyWithFiatProps) => {
  const { isAvailable } = useCryptoBuyAvailable(cryptoSymbol, networkMarketName);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const open = Boolean(anchorEl);
  const trackEvent = useRootStore((store) => store.trackEvent);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    trackEvent(GENERAL.OPEN_MODAL, {
      modal: 'Buy crypto with fiat',
      assetName: cryptoSymbol,
      funnel: funnel,
    });
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  return isAvailable ? (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={handleClick}
        startIcon={
          <SvgIcon sx={{ mr: -1 }}>
            <CreditCardIcon />
          </SvgIcon>
        }
      >
        Buy {cryptoSymbol} with Fiat
      </Button>
      <BuyWithFiatModal cryptoSymbol={cryptoSymbol} open={open} close={handleClose} />
    </>
  ) : null;
};
