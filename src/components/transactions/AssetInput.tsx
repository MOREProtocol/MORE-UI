import { valueToBigNumber } from '@aave/math-utils';
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
import { FONT_MONO } from 'src/utils/theme';

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
  chainId?: number;
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
  quickPercent?: boolean;
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
  quickPercent = false,
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
      {inputTitle !== null && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="description" color="text.secondary">
            {inputTitle ? inputTitle : 'Amount'}
          </Typography>
          {capType && <AvailableTooltip capType={capType} />}
        </Box>
      )}

      <Box
        sx={(theme) => ({
          backgroundColor: theme.palette.background.surface,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '18px',
          overflow: 'hidden',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          '&:focus-within': {
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 3px ${theme.palette.action.focus}`,
          },
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: '20px', pt: '18px' }}>
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
                  fontFamily: FONT_MONO,
                  fontSize: '28px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  lineHeight: '36px',
                  padding: 0,
                  height: '36px',
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
            <Box
              sx={(theme) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
                pl: '6px',
                pr: '12px',
                py: '6px',
                borderRadius: '9999px',
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
              })}
            >
              <TokenIcon
                mToken={asset.mToken}
                symbol={asset.iconSymbol || asset.symbol}
                address={asset.address}
                chainId={asset.chainId}
                sx={{ fontSize: '24px' }}
              />
              <Typography variant="subheader1" sx={{ lineHeight: '24px' }} data-cy={'inputAsset'}>
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
                  flexShrink: 0,
                  borderRadius: '9999px',
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  pl: '6px',
                  pr: 0,
                  py: '6px',
                  transition: 'border-color 150ms ease',
                  '&:hover': { borderColor: 'primary.light' },
                  '&.AssetInput__select .MuiOutlinedInput-input': {
                    p: 0,
                    backgroundColor: 'transparent',
                    pr: '32px !important',
                  },
                  '&.AssetInput__select .MuiOutlinedInput-notchedOutline': { display: 'none' },
                  '&.AssetInput__select .MuiSelect-icon': {
                    color: 'text.muted',
                    fontSize: '20px',
                    right: '10px',
                    top: 'calc(50% - 10px)',
                  },
                }}
                renderValue={(symbol) => {
                  const asset =
                    assets.length === 1
                      ? assets[0]
                      : assets && (assets.find((asset) => asset.symbol === symbol) as T);
                  return (
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      data-cy={`assetsSelectedOption_${asset.symbol.toUpperCase()}`}
                    >
                      <TokenIcon
                        symbol={asset.iconSymbol || asset.symbol}
                        mToken={asset.mToken}
                        sx={{ fontSize: '24px' }}
                      />
                      <Typography variant="subheader1" color="text.primary">
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

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            minHeight: '16px',
            px: '20px',
            pt: '10px',
            pb: '14px',
          }}
        >
          {loading || !usdValue ? (
            <Box sx={{ flex: 1 }} />
          ) : (
            <FormattedNumber
              value={isNaN(Number(usdValue)) ? 0 : Number(usdValue)}
              symbol="USD"
              visibleDecimals={2}
              variant="secondary12"
              color="text.secondary"
              symbolsColor="text.secondary"
              flexGrow={1}
            />
          )}

          {asset.balance && onChange && (
            <>
              <Typography component="div" variant="caption" color="text.secondary">
                {balanceText && balanceText !== '' ? balanceText : 'Balance'}:{' '}
                <FormattedNumber
                  value={asset.balance}
                  compact
                  variant="secondary12"
                  color="text.secondary"
                  symbolsColor="text.disabled"
                />{' '}
                {symbol}
              </Typography>
              {!disableInput && !quickPercent && (
                <Button
                  size="small"
                  sx={{
                    minWidth: 0,
                    minHeight: 'unset',
                    ml: 2,
                    px: '7px',
                    py: '3px',
                    borderRadius: '5px',
                    backgroundColor: 'primary.main',
                    color: 'common.white',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    lineHeight: 1,
                    '&:hover': { backgroundColor: 'primary.dark' },
                    '&.Mui-disabled': {
                      backgroundColor: 'action.disabledBackground',
                      color: 'text.disabled',
                    },
                  }}
                  onClick={() => {
                    if (event) {
                      trackEvent(event.eventName, { ...event.eventParams });
                    }

                    onChange('-1');
                  }}
                  disabled={disabled || isMaxSelected}
                >
                  MAX
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

      {quickPercent && onChange && maxValue !== undefined && !disableInput && !loading && (
        <Box sx={{ display: 'flex', gap: '6px', mt: 3 }}>
          {[0.25, 0.5, 0.75].map((percent) => {
            const percentValue = valueToBigNumber(maxValue || '0')
              .multipliedBy(percent)
              .toString();
            const isActive = value !== '' && value === percentValue;
            return (
              <Button
                key={percent}
                variant="outlined"
                disabled={disabled}
                onClick={() => onChange(percentValue)}
                sx={(theme) => ({
                  flex: 1,
                  py: '7px',
                  borderRadius: '9px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: isActive ? theme.palette.action.selected : 'background.paper',
                  borderColor: isActive ? 'transparent' : 'divider',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  '&:hover': {
                    backgroundColor: isActive ? theme.palette.action.selected : 'background.paper',
                    borderColor: isActive ? 'transparent' : 'text.muted',
                    color: isActive ? 'primary.main' : 'text.primary',
                  },
                })}
              >
                {percent * 100}%
              </Button>
            );
          })}
          <Button
            variant="outlined"
            disabled={disabled || isMaxSelected}
            onClick={() => {
              if (event) {
                trackEvent(event.eventName, { ...event.eventParams });
              }
              onChange('-1');
            }}
            sx={(theme) => ({
              flex: 1,
              py: '7px',
              borderRadius: '9px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: isMaxSelected ? theme.palette.action.selected : 'background.paper',
              borderColor: isMaxSelected ? 'transparent' : 'divider',
              color: isMaxSelected ? 'primary.main' : 'text.secondary',
              '&:hover': {
                backgroundColor: isMaxSelected ? theme.palette.action.selected : 'background.paper',
                borderColor: isMaxSelected ? 'transparent' : 'text.muted',
                color: isMaxSelected ? 'primary.main' : 'text.primary',
              },
            })}
          >
            MAX
          </Button>
        </Box>
      )}
    </Box>
  );
};
