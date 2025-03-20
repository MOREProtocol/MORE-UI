import { Box, Button, Checkbox, FormControlLabel, Link, Typography } from '@mui/material';
import React, { useState } from 'react';
import { toggleLocalStorageClick } from 'src/helpers/toggle-local-storage-click';
import { ModalType, useModalContext } from 'src/hooks/useModal';
import { useRootStore } from 'src/store/root';
import { DASHBOARD } from 'src/utils/mixPanelEvents';

import { BasicModal } from '../../primitives/BasicModal';
import { TxModalTitle } from '../FlowCommons/TxModalTitle';

export const WelcomeModal = () => {
  const { type, close } = useModalContext();
  const trackEvent = useRootStore((store) => store.trackEvent);
  const [value, setValue] = useState(false);

  return (
    <BasicModal
      open={type === ModalType.Welcome}
      setOpen={close}
      withCloseButton={false}
      contentMaxWidth={450}
    >
      <TxModalTitle title={'Welcome to MORE Markets!'} />
      <Box>
        <Typography sx={{ mb: 1 }} color="text.secondary">
          To use the app, please acknowledge that you agree with the terms of use and privacy policy
          by ticking the box below.
        </Typography>
      </Box>
      <Box sx={{ pt: 3 }}>
        <Typography sx={{ mb: 1 }} color="text.secondary">
          Please note that while all users can make deposits and withdrawals, Flow Wallet users are
          currently limited. <br />
          Flow Wallet will be available in a few days.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex' }}>
        <FormControlLabel
          sx={{ mt: 3 }}
          control={<Checkbox />}
          checked={value}
          onChange={() => {
            trackEvent(DASHBOARD.AGREE_POLICY, {});
            toggleLocalStorageClick(value, setValue, 'welcome-check');
          }}
          label={
            <>
              I agree to the{' '}
              <Link href="https://docs.more.markets/agreements/terms-of-use" target="_blank">
                Terms of Use
              </Link>{' '}
              and the{' '}
              <Link href="https://docs.more.markets/agreements/privacy-policy">
                Privacy policy.
              </Link>
            </>
          }
        />
      </Box>
      <Button
        sx={{ mt: 2, width: '100%' }}
        variant="contained"
        onClick={() => close()}
        size="large"
        disabled={!value}
      >
        <Typography variant="description">Continue</Typography>
      </Button>
    </BasicModal>
  );
};
