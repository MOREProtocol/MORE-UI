import { ShoppingCartIcon } from '@heroicons/react/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/solid';
import { Box, Button, SvgIcon } from '@mui/material';
import { useRootStore } from 'src/store/root';

import { BatchTransactionsModal } from './BatchTransactionsModal';
import { UserAuthenticated } from 'src/components/UserAuthenticated';

interface BatchTransactionProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export const BatchTransactionsButton = ({ open, setOpen }: BatchTransactionProps) => {
  const batchTransactionGroups = useRootStore((state) => state.batchTransactionGroups);

  const handleToggle = () => {
    setOpen(!open);
  };

  return (
    <>
      {batchTransactionGroups.length > 0 && (
        <Box paddingX={2}>
          <Button
            variant={open ? 'surface' : 'gradient'}
            onClick={handleToggle}
            startIcon={
              <SvgIcon>
                <ShoppingCartIcon />
              </SvgIcon>
            }
            endIcon={
              <SvgIcon
                sx={{
                  display: { xs: 'none', md: 'block' },
                }}
              >
                {open ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </SvgIcon>
            }
          >
            Batch Transactions
          </Button>
        </Box>
      )}
      <UserAuthenticated>
        {(user) => (
          <BatchTransactionsModal open={open} setOpen={setOpen} user={user} />
        )}
      </UserAuthenticated>
    </>
  );
};
