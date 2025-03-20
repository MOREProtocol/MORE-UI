import { Button } from '@mui/material';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useRootStore } from 'src/store/root';
import { AUTH } from 'src/utils/mixPanelEvents';

export interface ConnectWalletProps {
  funnel?: string;
}

export const ConnectWalletButton: React.FC<ConnectWalletProps> = ({ funnel }) => {
  const { openConnectModal } = useConnectModal();
  const trackEvent = useRootStore((store) => store.trackEvent);

  return (
    <>
      <Button
        variant="gradient"
        onClick={() => {
          trackEvent(AUTH.CONNECT_WALLET, { funnel: funnel });
          openConnectModal();
        }}
      >
        Connect wallet
      </Button>
    </>
  );
};
