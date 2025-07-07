import { Chip, ChipProps, useTheme } from '@mui/material';
import { FormattedNumber } from './FormattedNumber';

interface UsdChipProps extends Omit<ChipProps, 'label'> {
  value: string | number;
  compact?: boolean;
  textVariant?: 'secondary12' | 'secondary14' | 'main12' | 'main14';
}

export const UsdChip = ({
  value,
  compact = true,
  textVariant = 'secondary12',
  sx,
  ...chipProps
}: UsdChipProps) => {
  const theme = useTheme();

  return (
    <Chip
      label={
        <FormattedNumber
          value={value}
          symbol="USD"
          variant={textVariant}
          size="small"
          compact={compact}
          sx={{
            color: theme.palette.mode === 'light' ? '#FFFFFF' : '#000000',
            '& .MuiTypography-root': {
              color: theme.palette.mode === 'light' ? '#FFFFFF' : '#000000',
            }
          }}
        />
      }
      size="small"
      color="primary"
      sx={{
        height: '18px',
        ...sx
      }}
      {...chipProps}
    />
  );
}; 