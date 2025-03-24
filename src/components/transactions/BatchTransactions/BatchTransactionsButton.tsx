import { ShoppingCartIcon } from '@heroicons/react/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/solid';
import { Box, Button, SvgIcon } from '@mui/material';
import { ethers } from 'ethers';
import { useEffect } from 'react';
import { UserAuthenticated } from 'src/components/UserAuthenticated';
import { useRootStore } from 'src/store/root';
import { useAccount, useWalletClient } from 'wagmi';

import { BatchTransactionsModal } from './BatchTransactionsModal';

interface BatchTransactionProps {
  open: boolean;
  setOpen?: (value: boolean) => void;
}

export const BatchTransactionsButton = ({ open, setOpen }: BatchTransactionProps) => {
  const [batchTransactionGroups, setSigner, signer] = useRootStore((state) => [
    state.batchTransactionGroups,
    state.setSigner,
    state.signer,
  ]);

  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (isConnected && walletClient) {
      const provider = new ethers.providers.Web3Provider(
        walletClient as ethers.providers.ExternalProvider
      );
      const signer = provider.getSigner();
      if (!!signer) {
        setSigner(signer);
      }
    }
  }, [isConnected, walletClient, setSigner]);

  const handleToggle = () => {
    setOpen(!open);
  };

  if (!signer) {
    return <></>;
  }

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
      {batchTransactionGroups.length > 0 && (
        <UserAuthenticated>
          {(user) => <BatchTransactionsModal open={open} setOpen={setOpen} user={user} />}
        </UserAuthenticated>
      )}
    </>
  );
};
