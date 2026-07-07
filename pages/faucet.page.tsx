import { Box, Typography } from '@mui/material';
import dynamic from 'next/dynamic';
import { PageMasthead } from 'src/components/PageMasthead';
import { Link } from 'src/components/primitives/Link';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { MainLayout } from 'src/layouts/MainLayout';
import FaucetAssetsList from 'src/modules/faucet/FaucetAssetsList';

const FaucetModal = dynamic(() =>
  import('../src/components/transactions/Faucet/FaucetModal').then((module) => module.FaucetModal)
);

export default function Faucet() {
  const { currentMarketData } = useProtocolDataContext();

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
      <PageMasthead
        title={`${currentMarketData.marketTitle} Faucet`}
        subtitle="Get free testnet assets to test the MORE protocol. Switch your wallet to the matching testnet, select an asset, and click “Faucet” to receive tokens — they carry no real value."
      />
      <Typography variant="secondary14" sx={{ color: 'text.secondary', mb: 4, display: 'block' }}>
        <Link
          color="text.secondary"
          href="https://docs.aave.com/developers/guides/testing-guide"
          sx={{ textDecoration: 'underline' }}
        >
          Learn more
        </Link>{' '}
        about testing with the faucet.
      </Typography>
      <FaucetAssetsList />
    </Box>
  );
}

Faucet.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <MainLayout>
      {page}
      <FaucetModal />
    </MainLayout>
  );
};
