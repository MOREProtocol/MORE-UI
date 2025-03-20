import { ShoppingCartIcon } from '@heroicons/react/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/solid';
import { Trans } from '@lingui/react/macro';
import { Box, Button, SvgIcon } from '@mui/material';
import { useRootStore } from 'src/store/root';

import { BatchTransactionsModal } from './BatchTransactionsModal';

interface BatchTransactionProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export const BatchTransactionsButton = ({ open, setOpen }: BatchTransactionProps) => {
  const batchTransactions = useRootStore((state) => state.batchTransactions);

  const handleToggle = () => {
    setOpen(!open);
  };

  return (
    <>
      {batchTransactions?.length > 0 && (
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
            <Trans>Batch Transactions</Trans>
          </Button>
        </Box>
      )}
      <BatchTransactionsModal open={open} setOpen={setOpen} />
    </>
  );
};
