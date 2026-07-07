import { Box } from '@mui/material';

import { VaultAssetsList } from './VaultAssetsList';

export const VaultAssetsListContainer = () => {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1600,
        mx: 'auto',
        px: { xs: '16px', sm: '32px' },
        pt: { xs: 3, md: 3 },
        pb: { xs: 6, md: 12 },
      }}
    >
      <VaultAssetsList />
    </Box>
  );
};
