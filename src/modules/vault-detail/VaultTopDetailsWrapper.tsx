import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import { Box, Button, SvgIcon, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import { useVaultInfo, VaultTab } from 'src/hooks/useVaultInfo';

import { NewTopInfoPanel } from './NewTopInfoPanel';
import { VaultTopDetails } from './VaultTopDetails';

export const VaultTopDetailsWrapper = () => {
  const router = useRouter();
  const { selectedTab, setSelectedTab } = useVaultInfo();

  const theme = useTheme();
  const downToSM = useMediaQuery(theme.breakpoints.down('sm'));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue as VaultTab);
  };

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
          value={selectedTab}
          onChange={handleTabChange}
          aria-label="vault tabs"
          textColor="inherit"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': {
              minWidth: 'auto',
              marginRight: '24px',
              padding: '12px 0',
              fontWeight: 'medium',
              fontSize: '14px',
              textTransform: 'none',
            },
          }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Financials" value="financials" />
          <Tab label="Allocations" value="allocations" />
          <Tab label="Activity" value="activity" />
          <Tab label="Manage" value="manage" />
        </Tabs>
      </Box>
    </NewTopInfoPanel>
  );
};
