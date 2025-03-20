import { ChainId } from '@aave/contract-helpers';
import { Button, Typography } from '@mui/material';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { TrackEventProps } from 'src/store/analyticsSlice';
import { useRootStore } from 'src/store/root';
import { GENERAL } from 'src/utils/mixPanelEvents';

import { Warning } from '../../primitives/Warning';

export type ChangeNetworkWarningProps = {
  funnel?: string;
  networkName: string;
  chainId: ChainId;
  event?: TrackEventProps;
};

export const ChangeNetworkWarning = ({
  networkName,
  chainId,
  event,
  funnel,
}: ChangeNetworkWarningProps) => {
  const { switchNetwork, switchNetworkError } = useWeb3Context();
  const trackEvent = useRootStore((store) => store.trackEvent);

  const handleSwitchNetwork = () => {
    trackEvent(GENERAL.SWITCH_NETWORK, { funnel, ...event?.eventParams, network: networkName });
    switchNetwork(chainId);
  };
  return (
    <Warning severity="error" icon={false}>
      {switchNetworkError ? (
        <Typography>
          Seems like we can&apos;t switch the network automatically. Please check if you can change
          it from the wallet.
        </Typography>
      ) : (
        <Typography variant="description">
          Please switch to {networkName}.{' '}
          <Button
            variant="text"
            sx={{ ml: '2px', verticalAlign: 'top' }}
            onClick={handleSwitchNetwork}
            disableRipple
          >
            <Typography variant="description">Switch Network</Typography>
          </Button>
        </Typography>
      )}
    </Warning>
  );
};
