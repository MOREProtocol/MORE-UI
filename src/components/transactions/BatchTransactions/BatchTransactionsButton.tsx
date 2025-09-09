import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/solid';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Badge, Box, Button, SvgIcon } from '@mui/material';
import { ethers } from 'ethers';
import { useEffect, useMemo } from 'react';
import { useRootStore } from 'src/store/root';
import { useAccount, useWalletClient } from 'wagmi';

import { BatchTransactionsModal } from './BatchTransactionsModal/BatchTransactionsModal';
import { multicalls } from 'src/utils/const';
import { usePoolReservesHumanized } from 'src/hooks/pool/usePoolReserves';
import { marketsData } from 'src/ui-config/marketsConfig';

interface BatchTransactionProps {
  open: boolean;
  setOpen?: (value: boolean) => void;
}

export const BatchTransactionsButton = ({ open, setOpen }: BatchTransactionProps) => {
  const [setSigner, signer, batchTransactionGroups, setMulticallAddress, setPoolReserves] = useRootStore((state) => [
    state.setSigner,
    state.signer,
    state.batchTransactionGroups,
    state.setMulticallAddress,
    state.setPoolReserves,
  ]);
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [currentMarket] = useRootStore((store) => [store.currentMarket]);
  const { data: poolReserves } = usePoolReservesHumanized(marketsData[currentMarket]);

  const hasBatchTransactions = useMemo(
    () => batchTransactionGroups.length > 0,
    [batchTransactionGroups]
  );

  useEffect(() => {
    if (isConnected && walletClient) {
      const provider = new ethers.providers.Web3Provider(
        walletClient as ethers.providers.ExternalProvider
      );
      setPoolReserves(poolReserves);
      setMulticallAddress(multicalls[currentMarket === 'proto_flow_v3' ? 'mainnet' : 'testnet']);
      const signer = provider.getSigner();
      if (!!signer) {
        setSigner(signer);
      }
    }
  }, [isConnected, walletClient, setSigner]);

  const handleToggle = () => {
    setOpen(!open);
  };

  if (!signer || !hasBatchTransactions) {
    return <></>;
  }

  return (
    <>
      <Box paddingRight={2}>
        <Button
          variant={open || batchTransactionGroups.length === 0 ? 'surface' : 'gradient'}
          onClick={handleToggle}
          sx={{
            ...(!hasBatchTransactions && { p: '7px 8px' }),
            minWidth: 'unset',
            bgcolor: 'background.surface',
            '&:hover': {
              bgcolor: 'background.surface3',
            },
            color: 'text.primary',
          }}
          startIcon={
            hasBatchTransactions ? (
              <Badge
                badgeContent={batchTransactionGroups.length}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    fontSize: '10px'
                  }
                }}
              >
                <SvgIcon sx={{ color: '#F1F1F3', ml: 1 }} fontSize="small">
                  <ShoppingCartIcon />
                </SvgIcon>
              </Badge>
            ) : (
              <></>
            )
          }
          endIcon={
            <SvgIcon
              sx={{
                display: hasBatchTransactions ? { xs: 'none', md: 'block' } : 'none',
              }}
            >
              {open ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </SvgIcon>
          }
        >
          {hasBatchTransactions ? (
            'Batch Transactions'
          ) : (
            <SvgIcon sx={{ color: '#F1F1F3' }} fontSize="small">
              <ShoppingCartIcon />
            </SvgIcon>
          )}
        </Button>
      </Box>
      <BatchTransactionsModal open={open} setOpen={setOpen} />
    </>
  );
};
