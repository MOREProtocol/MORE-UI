import { VaultAssetsList } from './VaultAssetsList';
import { Box } from '@mui/material';

export const VaultAssetsListContainer = () => {
  return (
    <Box sx={{ mt: 2, px: { xs: 2, sm: 4, md: 6, lg: 10 }, pb: 8 }}>
      <VaultAssetsList />
    </Box>
  );
};
