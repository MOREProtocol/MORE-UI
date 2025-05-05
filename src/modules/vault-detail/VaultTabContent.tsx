import { Box, Typography } from '@mui/material';
import React from 'react';
import { useVault } from 'src/hooks/vault/useVault';

import { VaultActivity } from './VaultActivity';
import { VaultAllocations } from './VaultAllocations';
import { VaultFinancials } from './VaultFinancials';
import { VaultManagement } from './VaultManagement/VaultManagement';
import { VaultOverview } from './VaultOverview';

export const VaultTabContent: React.FC = () => {
  const { selectedTab, selectedVaultId } = useVault();

  if (!selectedVaultId) {
    return <Typography>No vault selected</Typography>;
  }

  return (
    <Box sx={{ height: '100%' }}>
      <div className="vault-tab-content">
        {selectedTab === 'overview' && <VaultOverview />}
        {selectedTab === 'financials' && <VaultFinancials />}
        {selectedTab === 'allocations' && <VaultAllocations />}
        {selectedTab === 'activity' && <VaultActivity />}
        {selectedTab === 'manage' && <VaultManagement />}
      </div>
    </Box>
  );
};
