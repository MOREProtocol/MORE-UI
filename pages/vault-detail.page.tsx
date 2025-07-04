import { Box, useTheme } from '@mui/material';
import { ReactNode } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { VaultDetail } from 'src/modules/vault-detail/VaultDetail';

interface ContentContainerProps {
  children: ReactNode;
}

const ContentContainer = ({ children }: ContentContainerProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: theme.palette.background.paper,
      }}
    >
      {children}
    </Box>
  );
};

export default function VaultDetailPage() {
  return (
    <ContentContainer>
      <VaultDetail />
    </ContentContainer>
  );
}

VaultDetailPage.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
