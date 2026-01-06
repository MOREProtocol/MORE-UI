import { Alert, Box } from '@mui/material';
import { ReactNode } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { VaultDetail } from 'src/modules/vault-detail/VaultDetail';

interface ContentContainerProps {
  children: ReactNode;
}

const ContentContainer = ({ children }: ContentContainerProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}
    >
      {children}
    </Box>
  );
};

export default function VaultDetailPage() {
  return (
    <ContentContainer>
      <Alert severity="warning" sx={{ borderRadius: '18px', m: 2 }}>
        On Dec. 27, the Flow network experienced a security incident. Network recovery and reindexing are currently in progress. As a result, data displayed in MORE, especially Subgraph data such as APY, may be inaccurate.
      </Alert>
      <VaultDetail />
    </ContentContainer>
  );
}

VaultDetailPage.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
