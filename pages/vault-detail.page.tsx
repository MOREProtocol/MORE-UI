import { Box, Container, useTheme } from '@mui/material';
import { ReactNode, useEffect } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { VaultTabContent } from 'src/modules/vault-detail/VaultTabContent';
import { VaultTopDetailsWrapper } from 'src/modules/vault-detail/VaultTopDetailsWrapper';
import { useRootStore } from 'src/store/root';
import { ENABLE_TESTNET } from 'src/utils/marketsAndNetworksConfig';

interface ContentContainerProps {
  children: ReactNode;
}

const ContentContainer = ({ children }: ContentContainerProps) => {
  const theme = useTheme();
  const { currentMarket, setCurrentMarket } = useRootStore();

  useEffect(() => {
    if (ENABLE_TESTNET && currentMarket !== 'proto_testnet_v3') {
      setCurrentMarket('proto_testnet_v3');
    } else if (!ENABLE_TESTNET && currentMarket !== 'proto_flow_v3') {
      setCurrentMarket('proto_flow_v3');
    }
  }, [setCurrentMarket, currentMarket]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: theme.palette.background.paper,
        // mt: { xs: '-32px', lg: '-46px', xl: '-44px', xxl: '-48px' },
      }}
    >
      <Container>{children}</Container>
    </Box>
  );
};

export default function VaultDetail() {
  return (
    <>
      <VaultTopDetailsWrapper />
      <ContentContainer>
        <VaultTabContent />
      </ContentContainer>
    </>
  );
}

VaultDetail.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
