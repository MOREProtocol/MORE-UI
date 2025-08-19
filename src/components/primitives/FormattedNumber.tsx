import { normalizeBN, valueToBigNumber } from '@aave/math-utils';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Variant } from '@mui/material/styles/createTypography';
import type {
  TypographyProps,
  TypographyPropsVariantOverrides,
} from '@mui/material/Typography/Typography';
import type { OverridableStringUnion } from '@mui/types';
import type { ElementType } from 'react';

interface CompactNumberProps {
  value: string | number;
  visibleDecimals?: number;
  roundDown?: boolean;
  compactThreshold?: number;
}

const POSTFIXES = ['', 'K', 'M', 'B', 'T', 'P', 'E', 'Z', 'Y'];

export const compactNumber = ({
  value,
  visibleDecimals = 2,
  roundDown,
  compactThreshold,
}: CompactNumberProps) => {
  const bnValue = valueToBigNumber(value);

  let integerPlaces = bnValue.toFixed(0).length;
  if (compactThreshold && Number(value) <= compactThreshold) {
    integerPlaces = 0;
  }
  const significantDigitsGroup = Math.min(
    Math.floor(integerPlaces ? (integerPlaces - 1) / 3 : 0),
    POSTFIXES.length - 1
  );
  const postfix = POSTFIXES[significantDigitsGroup];
  let formattedValue = normalizeBN(bnValue, 3 * significantDigitsGroup).toNumber();
  if (roundDown) {
    // Truncates decimals after the visible decimal point, i.e. 10.237 with 2 decimals becomes 10.23
    formattedValue =
      Math.trunc(Number(formattedValue) * 10 ** visibleDecimals) / 10 ** visibleDecimals;
  }

  // Check if the decimal part is zero
  const hasNonZeroDecimals = formattedValue % 1 !== 0;
  const actualDecimals = hasNonZeroDecimals ? visibleDecimals : 0;

  const prefix = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: actualDecimals,
    minimumFractionDigits: actualDecimals,
  }).format(formattedValue);

  return { prefix, postfix };
};

function CompactNumber({ value, visibleDecimals, roundDown }: CompactNumberProps) {
  const { prefix, postfix } = compactNumber({ value, visibleDecimals, roundDown });

  return (
    <>
      {prefix}
      {postfix}
    </>
  );
}

export type FormattedNumberProps = TypographyProps<ElementType, { component?: ElementType }> & {
  value: string | number;
  symbol?: string;
  visibleDecimals?: number;
  compact?: boolean;
  percent?: boolean;
  coloredPercent?: boolean;
  symbolsColor?: string;
  symbolsVariant?: OverridableStringUnion<Variant | 'inherit', TypographyPropsVariantOverrides>;
  roundDown?: boolean;
  compactThreshold?: number;
};

export function FormattedNumber({
  value,
  symbol,
  visibleDecimals,
  compact,
  percent,
  coloredPercent,
  symbolsVariant,
  symbolsColor,
  roundDown,
  compactThreshold,
  ...rest
}: FormattedNumberProps) {
  const theme = useTheme();
  const number = percent || coloredPercent ? Number(value) * 100 : Number(value);

  let decimals: number = visibleDecimals ?? 0;
  if (number === 0) {
    decimals = 0;
  } else if (visibleDecimals === undefined) {
    if (number >= 1 || percent || coloredPercent || symbol === 'USD') {
      decimals = 2;
    } else {
      decimals = 7;
    }
  }

  const minValue = 10 ** -(decimals as number);
  const isSmallerThanMin = number !== 0 && Math.abs(number) < Math.abs(minValue);
  let formattedNumber = isSmallerThanMin ? minValue : number;
  const forceCompact = compact !== false && (compact || number > 99_999);
  const percentColor = coloredPercent
    ? number > 0
      ? theme.palette.success.main
      : theme.palette.error.main
    : undefined;

  // rounding occurs inside of CompactNumber as the prefix, not base number is rounded
  if (roundDown && !forceCompact) {
    formattedNumber = Math.trunc(Number(formattedNumber) * 10 ** decimals) / 10 ** decimals;
  }

  return (
    <Typography
      {...rest}
      sx={{
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        ...(percentColor && { color: percentColor }),
        ...rest.sx,
      }}
      noWrap
    >
      {coloredPercent && (
        <Typography component="span" sx={{ mr: 0.5 }} variant={symbolsVariant || rest.variant}>
          {Number(value) > 0 ? '+' : ''}
        </Typography>
      )}
      {isSmallerThanMin && (
        <Typography
          component="span"
          sx={{ mr: 0.5 }}
          variant={symbolsVariant || rest.variant}
          color={symbolsColor || 'text.secondary'}
        >
          {'<'}
        </Typography>
      )}
      {symbol?.toLowerCase() === 'usd' && (!percent || !coloredPercent) && (
        <Typography
          component="span"
          sx={{ mr: 0.5 }}
          variant={symbolsVariant || rest.variant}
          color={symbolsColor || 'text.secondary'}
        >
          $
        </Typography>
      )}

      {!forceCompact ? (() => {
        // Check if the decimal part is zero
        const hasNonZeroDecimals = formattedNumber % 1 !== 0;
        const actualDecimals = hasNonZeroDecimals ? decimals : 0;

        return new Intl.NumberFormat('en-US', {
          maximumFractionDigits: actualDecimals,
          minimumFractionDigits: actualDecimals,
        }).format(formattedNumber);
      })() : (
        <CompactNumber
          value={formattedNumber}
          visibleDecimals={decimals}
          roundDown={roundDown}
          compactThreshold={compactThreshold}
        />
      )}

      {(percent || coloredPercent) && (
        <Typography
          component="span"
          sx={{ ml: 0.5 }}
          variant={symbolsVariant || rest.variant}
          color={symbolsColor || percentColor || 'text.secondary'}
        >
          %
        </Typography>
      )}
      {symbol?.toLowerCase() !== 'usd' && typeof symbol !== 'undefined' && (
        <Typography
          component="span"
          sx={{ ml: 0.5 }}
          variant={symbolsVariant || rest.variant}
          color={symbolsColor || 'text.secondary'}
        >
          {symbol}
        </Typography>
      )}
    </Typography>
  );
}
