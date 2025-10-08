import { Box, Menu, MenuItem, Tooltip, Typography, CircularProgress } from '@mui/material';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Base64Token, TokenIcon } from 'src/components/primitives/TokenIcon';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { ERC20TokenType } from 'src/libs/web3-data-provider/Web3Provider';

interface TokenIconAddDropdownProps {
  reserve: ComputedReserveData;
  switchNetwork: (chainId: number) => Promise<void>;
  addERC20Token: (args: ERC20TokenType) => Promise<boolean>;
  currentChainId: number;
  connectedChainId: number;
  hideMToken?: boolean;
}

type PendingAddType = 'underlying' | 'mtoken' | null;

export function TokenIconAddDropdown({
  reserve,
  switchNetwork,
  addERC20Token,
  currentChainId,
  connectedChainId,
  hideMToken,
}: TokenIconAddDropdownProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [changingNetwork, setChangingNetwork] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<PendingAddType>(null);
  const [underlyingBase64, setUnderlyingBase64] = useState('');
  const [mTokenBase64, setMTokenBase64] = useState('');

  const open = Boolean(anchorEl);

  const handleIconClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    if (changingNetwork && currentChainId === connectedChainId && pendingAdd) {
      // After network switch completes, perform the pending add action
      (async () => {
        try {
          setAdding(true);
          if (pendingAdd === 'underlying') {
            await addERC20Token({
              address: reserve.underlyingAsset,
              decimals: reserve.decimals,
              symbol: reserve.symbol,
              image: reserve.iconSymbol && !/_/.test(reserve.iconSymbol) ? underlyingBase64 || undefined : undefined,
            });
          } else if (pendingAdd === 'mtoken' && !hideMToken) {
            await addERC20Token({
              address: reserve.aTokenAddress,
              decimals: reserve.decimals,
              symbol: '',
              image: reserve.iconSymbol && !/_/.test(reserve.iconSymbol) ? mTokenBase64 || undefined : undefined,
            });
          }
        } finally {
          setAdding(false);
          setChangingNetwork(false);
          setPendingAdd(null);
        }
      })();
    }
  }, [changingNetwork, currentChainId, connectedChainId, pendingAdd, addERC20Token, reserve, hideMToken, underlyingBase64, mTokenBase64]);

  const addUnderlying = async () => {
    if (currentChainId !== connectedChainId) {
      setPendingAdd('underlying');
      setChangingNetwork(true);
      await switchNetwork(currentChainId);
      return;
    }
    setAdding(true);
    try {
      await addERC20Token({
        address: reserve.underlyingAsset,
        decimals: reserve.decimals,
        symbol: reserve.symbol,
        image: reserve.iconSymbol && !/_/.test(reserve.iconSymbol) ? underlyingBase64 || undefined : undefined,
      });
    } finally {
      setAdding(false);
    }
  };

  const addMToken = async () => {
    if (hideMToken) return;
    if (currentChainId !== connectedChainId) {
      setPendingAdd('mtoken');
      setChangingNetwork(true);
      await switchNetwork(currentChainId);
      return;
    }
    setAdding(true);
    try {
      await addERC20Token({
        address: reserve.aTokenAddress,
        decimals: reserve.decimals,
        symbol: '',
        image: reserve.iconSymbol && !/_/.test(reserve.iconSymbol) ? mTokenBase64 || undefined : undefined,
      });
    } finally {
      setAdding(false);
    }
  };

  if (!reserve) return null;

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
      {/* Pre-generate base64 images for wallet add */}
      {reserve?.symbol && !/_/.test(reserve.symbol) && (
        <>
          <Base64Token symbol={reserve.iconSymbol} onImageGenerated={setUnderlyingBase64} mToken={false} />
          {!hideMToken && (
            <Base64Token symbol={reserve.iconSymbol} onImageGenerated={setMTokenBase64} mToken={true} />
          )}
        </>
      )}

      <Tooltip title="Add token to wallet" enterDelay={800} placement="top" arrow>
        <Box
          onClick={handleIconClick}
          sx={{
            cursor: adding || changingNetwork ? 'default' : 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': { opacity: 0.85 },
            transition: 'opacity 0.2s',
          }}
        >
          <TokenIcon symbol={reserve.iconSymbol} fontSize="large" />
          {(adding || changingNetwork) && (
            <CircularProgress size={16} sx={{ position: 'absolute', color: 'primary.main' }} />
          )}
        </Box>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{ 'aria-labelledby': 'token-icon-add-menu' }}
        keepMounted={true}
      >
        <Box sx={{ px: 4, pt: 3, pb: 2 }}>
          <Typography variant="secondary12" color="text.secondary">
            Underlying token
          </Typography>
        </Box>
        <MenuItem
          key="underlying"
          value="underlying"
          divider
          onClick={async () => {
            handleClose();
            await addUnderlying();
          }}
        >
          <TokenIcon symbol={reserve.iconSymbol} sx={{ fontSize: '20px' }} />
          <Typography variant="subheader1" sx={{ ml: 3 }} noWrap>
            {reserve.symbol}
          </Typography>
        </MenuItem>

        {!hideMToken && (
          <>
            <Box sx={{ px: 4, pt: 3, pb: 2 }}>
              <Typography variant="secondary12" color="text.secondary">
                More mToken
              </Typography>
            </Box>
            <MenuItem
              key="mtoken"
              value="mtoken"
              onClick={async () => {
                handleClose();
                await addMToken();
              }}
            >
              <TokenIcon symbol={reserve.iconSymbol} mToken={true} sx={{ fontSize: '20px' }} />
              <Typography variant="subheader1" sx={{ ml: 3 }} noWrap>
                {`m${reserve.symbol}`}
              </Typography>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
}


