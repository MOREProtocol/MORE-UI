import { Chip, ChipProps, useTheme } from '@mui/material';

import { FormattedNumber } from './FormattedNumber';

interface UsdChipProps extends Omit<ChipProps, 'label'> {
  value: string | number;
  compact?: boolean;
  textVariant?: 'caption' | 'secondary12' | 'secondary14' | 'main12' | 'main14';
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
            color: theme.palette.primary.main,
            '& .MuiTypography-root': {
              color: theme.palette.primary.main,
            },
          }}
        />
      }
      size="small"
      sx={{
        height: '18px',
        borderRadius: '9999px',
        bgcolor: theme.palette.action.selected,
        ...sx,
      }}
      {...chipProps}
    />
  );
};
