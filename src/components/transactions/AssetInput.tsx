import { XCircleIcon } from '@heroicons/react/solid';
import {
  Box,
  BoxProps,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputBase,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  useTheme,
} from '@mui/material';
import React, { ReactNode } from 'react';
import NumberFormat, { NumberFormatProps } from 'react-number-format';
import { TrackEventProps } from 'src/store/analyticsSlice';
import { useRootStore } from 'src/store/root';

import { CapType } from '../caps/helper';
import { AvailableTooltip } from '../infoTooltips/AvailableTooltip';
import { FormattedNumber } from '../primitives/FormattedNumber';
import { TokenIcon } from '../primitives/TokenIcon';

interface CustomProps {
  onChange: (event: { target: { name: string; value: string } }) => void;
  name: string;
  value: string;
}

export const NumberFormatCustom = React.forwardRef<NumberFormatProps, CustomProps>(
  function NumberFormatCustom(props, ref) {
    const { onChange, ...other } = props;

    return (
      <NumberFormat
        {...other}
        getInputRef={ref}
        onValueChange={(values) => {
          if (values.value !== props.value)
            onChange({
              target: {
                name: props.name,
                value: values.value || '',
              },
            });
        }}
        thousandSeparator
        isNumericString
        allowNegative={false}
      />
    );
  }
);

export interface Asset {
  balance?: string;
  symbol: string;
  iconSymbol?: string;
  address?: string;
  mToken?: boolean;
  priceInUsd?: string;
  decimals?: number;
}

export interface AssetInputProps<T extends Asset = Asset> {
  value: string;
  usdValue?: string;
  symbol: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  disableInput?: boolean;
  onSelect?: (asset: T) => void;
  assets: T[];
  capType?: CapType;
  maxValue?: string;
  isMaxSelected?: boolean;
  inputTitle?: ReactNode;
  balanceText?: ReactNode;
  loading?: boolean;
  event?: TrackEventProps;
  selectOptionHeader?: ReactNode;
  selectOption?: (asset: T) => ReactNode;
  sx?: BoxProps;
  exchangeRateComponent?: ReactNode;
}

export const AssetInput = <T extends Asset = Asset>({
  value,
  usdValue,
  symbol,
  onChange,
  disabled,
  disableInput,
  onSelect,
  assets,
  capType,
  maxValue,
  isMaxSelected,
  inputTitle,
  balanceText,
  loading = false,
  event,
  selectOptionHeader,
  selectOption,
  sx = {},
  exchangeRateComponent,
}: AssetInputProps<T>) => {
  const theme = useTheme();
  const trackEvent = useRootStore((store) => store.trackEvent);
  const handleSelect = (event: SelectChangeEvent) => {
    const newAsset = assets.find((asset) => asset.symbol === event.target.value) as T;
    onSelect && onSelect(newAsset);
    onChange && onChange('');
  };

  const asset =
    assets.length === 1
      ? assets[0]
      : assets && (assets.find((asset) => asset.symbol === symbol) as T);

  return (
    <Box {...sx}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography color="text.secondary">{inputTitle ? inputTitle : 'Amount'}</Typography>
        {capType && <AvailableTooltip capType={capType} />}
      </Box>

      <Box
        sx={(theme) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '6px',
          overflow: 'hidden',
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, px: 3, py: 2 }}>
          {loading ? (
            <Box sx={{ flex: 1 }}>
              <CircularProgress color="inherit" size="16px" />
            </Box>
          ) : (
            <InputBase
              sx={{ flex: 1 }}
              placeholder="0.00"
              disabled={disabled || disableInput}
              value={value}
              autoFocus
              onChange={(e) => {
                if (!onChange) return;
                if (Number(e.target.value) > Number(maxValue)) {
                  onChange('-1');
                } else {
                  onChange(e.target.value);
                }
              }}
              inputProps={{
                'aria-label': 'amount input',
                style: {
                  fontSize: '21px',
                  lineHeight: '28,01px',
                  padding: 0,
                  height: '28px',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                },
              }}
              // eslint-disable-next-line
              inputComponent={NumberFormatCustom as any}
            />
          )}
          {value !== '' && !disableInput && (
            <IconButton
              sx={{
                minWidth: 0,
                p: 0,
                left: 8,
                zIndex: 1,
                color: 'text.muted',
                '&:hover': {
                  color: 'text.secondary',
                },
              }}
              onClick={() => {
                onChange && onChange('');
              }}
              disabled={disabled}
            >
              <XCircleIcon height={16} />
            </IconButton>
          )}
          {!onSelect || assets.length === 1 ? (
            <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
              <TokenIcon
                mToken={asset.mToken}
                symbol={asset.iconSymbol || asset.symbol}
                sx={{ mr: 2, ml: 4 }}
              />
              <Typography variant="h3" sx={{ lineHeight: '28px' }} data-cy={'inputAsset'}>
                {symbol}
              </Typography>
            </Box>
          ) : (
            <FormControl>
              <Select
                disabled={disabled}
                value={asset.symbol}
                onChange={handleSelect}
                variant="outlined"
                className="AssetInput__select"
                data-cy={'assetSelect'}
                MenuProps={{
                  sx: {
                    maxHeight: '240px',
                    '.MuiPaper-root': {
                      border: theme.palette.mode === 'dark' ? '1px solid #EBEBED1F' : 'unset',
                      boxShadow: '0px 2px 10px 0px #0000001A',
                    },
                  },
                }}
                sx={{
                  p: 0,
                  '&.AssetInput__select .MuiOutlinedInput-input': {
                    p: 0,
                    backgroundColor: 'transparent',
                    pr: '24px !important',
                  },
                  '&.AssetInput__select .MuiOutlinedInput-notchedOutline': { display: 'none' },
                  '&.AssetInput__select .MuiSelect-icon': {
                    color: 'text.primary',
                    right: '0%',
                  },
                }}
                renderValue={(symbol) => {
                  const asset =
                    assets.length === 1
                      ? assets[0]
                      : assets && (assets.find((asset) => asset.symbol === symbol) as T);
                  return (
                    <Box
                      sx={{ display: 'flex', alignItems: 'center' }}
                      data-cy={`assetsSelectedOption_${asset.symbol.toUpperCase()}`}
                    >
                      <TokenIcon
                        symbol={asset.iconSymbol || asset.symbol}
                        mToken={asset.mToken}
                        sx={{ mr: 2, ml: 4 }}
                      />
                      <Typography variant="main16" color="text.primary">
                        {symbol}
                      </Typography>
                    </Box>
                  );
                }}
              >
                {selectOptionHeader ? selectOptionHeader : undefined}
                {assets.map((asset) => (
                  <MenuItem
                    key={asset.symbol}
                    value={asset.symbol}
                    data-cy={`assetsSelectOption_${asset.symbol.toUpperCase()}`}
                  >
                    {selectOption ? (
                      selectOption(asset)
                    ) : (
                      <>
                        <TokenIcon
                          mToken={asset.mToken}
                          symbol={asset.iconSymbol || asset.symbol}
                          sx={{ fontSize: '22px', mr: 1 }}
                        />
                        <ListItemText sx={{ mr: 6 }}>{asset.symbol}</ListItemText>
                        {asset.balance && <FormattedNumber value={asset.balance} compact />}
                      </>
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', height: '16px', px: 3, py: 2, mb: 1 }}>
          {loading || !usdValue ? (
            <Box sx={{ flex: 1 }} />
          ) : (
            <FormattedNumber
              value={isNaN(Number(usdValue)) ? 0 : Number(usdValue)}
              compact
              symbol="USD"
              variant="secondary12"
              color="text.muted"
              symbolsColor="text.muted"
              flexGrow={1}
            />
          )}

          {asset.balance && onChange && (
            <>
              <Typography component="div" variant="secondary12" color="text.secondary">
                {balanceText && balanceText !== '' ? balanceText : 'Balance'}{' '}
                <FormattedNumber
                  value={asset.balance}
                  compact
                  variant="secondary12"
                  color="text.secondary"
                  symbolsColor="text.disabled"
                />
              </Typography>
              {!disableInput && (
                <Button
                  size="small"
                  sx={{ minWidth: 0, ml: '7px', p: 0 }}
                  onClick={() => {
                    if (event) {
                      trackEvent(event.eventName, { ...event.eventParams });
                    }

                    onChange('-1');
                  }}
                  disabled={disabled || isMaxSelected}
                >
                  Max
                </Button>
              )}
            </>
          )}
        </Box>
        {exchangeRateComponent && (
          <Box
            sx={{
              background: theme.palette.background.surface,
              borderTop: `1px solid ${theme.palette.divider}`,
              px: 3,
              py: 2,
            }}
          >
            {exchangeRateComponent}
          </Box>
        )}
      </Box>
    </Box>
  );
};
