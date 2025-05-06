import { useEffect, useMemo, useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Button, Box, Collapse, Typography, Tooltip, IconButton, InputBase } from '@mui/material';
import { CompactMode } from 'src/components/CompactableTypography';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { useVault } from 'src/hooks/vault/useVault';
import { Address } from 'src/components/Address';
import { ethers } from 'ethers';

type SafeWalletButtonProps = {
  isDisabled: boolean;
  operation: 'deposit' | 'withdraw';
  vaultAddress: string;
  amount: string;
};

export default function SafeWalletButton({ isDisabled, operation, vaultAddress, amount }: SafeWalletButtonProps) {
  const { depositInVault, withdrawFromVault } = useVault();
  const [isArgsVisible, setIsArgsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [safeWalletAddress, setSafeWalletAddress] = useState('');
  const [tx, setTx] = useState<ethers.providers.TransactionRequest | null>(null);

  const { chainId } = useVault();
  const baseUrl = useMemo(() => chainId && networkConfigs[chainId].explorerLink, [chainId]);

  const isValidAddress = useMemo(() => {
    return ethers.utils.isAddress(safeWalletAddress);
  }, [safeWalletAddress]);

  const handleToggleArgs = () => {
    setIsArgsVisible((prev) => !prev);
  };

  useEffect(() => {
    if (isDisabled) {
      setIsArgsVisible(false);
    }
  }, [isDisabled]);

  useEffect(() => {
    const updateTx = async () => {
      const { tx } = operation === 'deposit'
        ? await depositInVault(amount, safeWalletAddress)
        : await withdrawFromVault(amount, safeWalletAddress);
      setTx(tx);
    };
    isValidAddress && updateTx();
  }, [safeWalletAddress, amount, isValidAddress]);

  const abi = useMemo(() => operation === 'deposit'
    ? `[{
        "inputs": [
          {
            "internalType": "uint256",
            "name": "assets",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          }
        ],
        "name": "deposit",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "shares",
            "type": "uint256"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      }]`
    : `[{
        "inputs": [
          {
            "internalType": "uint256",
            "name": "assets",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          }
        ],
        "name": "withdraw",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "shares",
            "type": "uint256"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      }]`,
    [operation]);

  return (
    <Box sx={{ width: '100%' }}>
      <Button
        variant="outlined"
        size="large"
        sx={{ minHeight: '44px', width: '100%' }}
        disabled={isDisabled}
        onClick={handleToggleArgs}
      >
        {operation === 'deposit' ? 'Deposit' : 'Withdraw'} with Safe
      </Button>

      <Collapse in={isArgsVisible} timeout="auto" unmountOnExit>
        <InputBase
          sx={{ width: '100%', fontSize: 16, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mt: 1, bgcolor: 'background.paper' }}
          placeholder={"Safe Wallet Address"}
          value={safeWalletAddress}
          onChange={(e) => {
            setSafeWalletAddress(e.target.value);
          }}
        />
        {isValidAddress && (
          <Box
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mt: 1, bgcolor: 'background.paper' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
              <Typography variant="main14" sx={{ py: 2 }}>
                Vault Contract Address
              </Typography>
              <Address
                address={vaultAddress}
                link={`${baseUrl}/address/${vaultAddress}`}
                variant="secondary14"
                compactMode={CompactMode.SM}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
              <Typography variant="main14" sx={{ py: 2 }}>
                Deposit ABI
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy ABI'} arrow>
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(abi);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  aria-label="copy abi"
                  sx={{ padding: '2px' }}
                >
                  <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
              <Typography variant="main14" sx={{ py: 2 }}>
                FLOW value
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy FLOW value'} arrow>
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(tx?.value?.toString() || '0');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  aria-label="copy flow value"
                  sx={{ padding: '2px' }}
                >
                  <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
              <Typography variant="main14" sx={{ py: 2 }}>
                Data HEX
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy Data HEX'} arrow>
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(tx?.data.toString() || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  aria-label="copy data hex"
                  sx={{ padding: '2px' }}
                >
                  <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Collapse>
    </Box>
  );
}
