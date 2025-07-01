import { Button, Box, Typography } from '@mui/material';
import { ConnectKitButton } from 'connectkit';
import { useRootStore } from 'src/store/root';
import { AUTH } from 'src/utils/mixPanelEvents';

export interface ConnectWalletProps {
  funnel?: string;
}

export const ConnectWalletButton: React.FC<ConnectWalletProps> = ({ funnel }) => {
  const trackEvent = useRootStore((store) => store.trackEvent);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', pt: 10 }}>
      <Typography variant="secondary14" color="text.secondary" sx={{ textAlign: 'center' }}>
        Connect wallet or use Family to sign up with email/phone
      </Typography>

      {/* Traditional Wallet Button - Web3 Wallets */}
      <ConnectKitButton.Custom>
        {({ isConnected, show, truncatedAddress, ensName }) => {
          return (
            <Button
              variant="gradient"
              onClick={() => {
                trackEvent(AUTH.CONNECT_WALLET, {
                  funnel: funnel,
                  method: 'traditional'
                });
                show?.();
              }}
              sx={{
                px: 3,
                py: 1.5,
                width: 'fit-content'
              }}
            >
              {isConnected
                ? (ensName ?? truncatedAddress)
                : "Connect with wallet or using email/phone"
              }
            </Button>
          );
        }}
      </ConnectKitButton.Custom>
    </Box>
  );
};
