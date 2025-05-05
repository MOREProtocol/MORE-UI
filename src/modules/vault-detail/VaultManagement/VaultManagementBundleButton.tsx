import { Badge, Box, Button } from '@mui/material';
import { ShoppingCartIcon } from 'src/components/icons/ShoppingCartIcon';
import { useVault } from 'src/hooks/vault/useVault';

import { VaultManagementBundleModal } from './VaultManagementBundleModal';

export const VaultManagementBundleButton = () => {
  const { nbTransactions, isDrawerOpen, setIsDrawerOpen } = useVault();

  const handleToggle = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  if (nbTransactions === 0) {
    return <></>;
  }

  return (
    <>
      <Box paddingX={2}>
        <Button
          variant="gradient"
          onClick={handleToggle}
          sx={{
            p: '8px 12px',
            minWidth: 'unset',
            ml: 2,
          }}
        >
          <Badge
            badgeContent={nbTransactions}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                minWidth: '16px',
                height: '16px',
                padding: '0 4px',
                fontSize: '10px',
              },
            }}
          >
            <ShoppingCartIcon sx={{ color: '#FFFFFF', fontSize: '20px' }} />
          </Badge>
        </Button>
      </Box>
      <VaultManagementBundleModal open={isDrawerOpen} setOpen={setIsDrawerOpen} />
    </>
  );
};
