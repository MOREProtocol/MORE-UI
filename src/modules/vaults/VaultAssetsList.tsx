import { Box, Grid } from '@mui/material';
import { useRouter } from 'next/router';
import { ROUTES } from 'src/components/primitives/Link';

import { mockVaultAssets } from './mockData';
import { VaultAssetsListItem } from './VaultAssetsListItem';

export const VaultAssetsList = () => {
  const router = useRouter();
  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={5} px={6} pb={8}>
        {mockVaultAssets.map((asset) => (
          <Grid item xs={12} sm={12} md={6} key={asset.id}>
            <VaultAssetsListItem
              data={asset}
              onClick={() => router.push(ROUTES.vaultDetail(asset.id))}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
