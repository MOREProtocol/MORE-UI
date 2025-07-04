import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import { Box, Button, SvgIcon, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import { useVault, VaultTab } from 'src/hooks/vault/useVault';
import { useEffect, useState } from 'react';

import { NewTopInfoPanel } from './NewTopInfoPanel';
import { VaultTopDetails } from './VaultTopDetails';
import { useVaultData } from 'src/hooks/vault/useVaultData';

export const VaultTopDetailsWrapper = () => {
  const router = useRouter();
  const { selectedVaultId, accountAddress } = useVault();
  const [selectedTab, setSelectedTab] = useState<VaultTab>('allocations');
  const vaultData = useVaultData(selectedVaultId);
  const canManageVault = vaultData?.data?.overview?.roles?.curator === accountAddress;
  const isVaultDataLoading = vaultData?.isLoading;

  const theme = useTheme();
  const downToSM = useMediaQuery(theme.breakpoints.down('sm'));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue as VaultTab);
  };

  useEffect(() => {
    if (!isVaultDataLoading && selectedTab === 'manage' && !canManageVault) {
      setSelectedTab('overview');
    }
  }, [isVaultDataLoading, selectedTab, canManageVault, setSelectedTab]);

  return (
    <NewTopInfoPanel
      titleComponent={
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: downToSM ? 'flex-start' : 'center',
              alignSelf: downToSM ? 'flex-start' : 'center',
              mb: 4,
              minHeight: '40px',
              flexDirection: downToSM ? 'column' : 'row',
            }}
          >
            <Button
              variant="surface"
              size="medium"
              color="primary"
              startIcon={
                <SvgIcon sx={{ fontSize: '20px' }}>
                  <ArrowBackRoundedIcon />
                </SvgIcon>
              }
              onClick={() => {
                // https://github.com/vercel/next.js/discussions/34980
                // if (history.state.idx !== 0) router.back();
                // else router.push('/vaults');
                router.push('/vaults');
              }}
              sx={{ mr: 3, mb: downToSM ? '24px' : '0' }}
            >
              Go Back
            </Button>
          </Box>
        </Box>
      }
    >
      <VaultTopDetails />
      <Box
        sx={{
          position: 'relative',
          bottom: 0,
          width: '100%',
        }}
      >
        <Tabs
          value={isVaultDataLoading ? false : selectedTab}
          onChange={handleTabChange}
          aria-label="vault tabs"
          textColor="inherit"
          sx={{
            '& .MuiTab-root': {
              minWidth: 'auto',
              marginRight: '24px',
              padding: '12px 0',
              fontWeight: 'medium',
              fontSize: '14px',
              textTransform: 'none',
            },
            '& .MuiTabs-indicator': {
              background: theme.palette.gradients.newGradient,
            },
          }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Financials" value="financials" />
          <Tab label="Allocations" value="allocations" />
          <Tab label="Activity" value="activity" />
          {canManageVault && <Tab label="Manage" value="manage" />}
        </Tabs>
      </Box>
    </NewTopInfoPanel>
  );
};
