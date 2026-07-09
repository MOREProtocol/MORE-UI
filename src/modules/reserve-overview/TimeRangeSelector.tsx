import { SxProps, Theme, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

export const supportedTimeRangeOptions = ['7d', '1m', '3m', '6m', '1y'] as const;

export enum ESupportedTimeRanges {
  SevenDays = '7d',
  OneMonth = '1m',
  ThreeMonths = '3m',
  SixMonths = '6m',
  OneYear = '1y',
  TwoYears = '2y',
  FiveYears = '5y',
}

export interface TimeRangeSelectorProps {
  disabled?: boolean;
  timeRanges: ESupportedTimeRanges[];
  selectedTimeRange: ESupportedTimeRanges;
  onTimeRangeChanged: (value: ESupportedTimeRanges) => void;
  sx?: {
    buttonGroup: SxProps<Theme>;
    button: SxProps<Theme>;
  };
}

export const TimeRangeSelector = ({
  disabled = false, // support default fallback
  timeRanges,
  selectedTimeRange,
  onTimeRangeChanged,
  ...props
}: TimeRangeSelectorProps) => {
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newInterval: ESupportedTimeRanges
  ) => {
    if (newInterval !== null) {
      // Invoke callback
      onTimeRangeChanged(newInterval);
    }
  };

  return (
    <ToggleButtonGroup
      disabled={disabled}
      value={selectedTimeRange}
      exclusive
      onChange={handleChange}
      aria-label="Date range"
      sx={props.sx?.buttonGroup}
    >
      {timeRanges.map((interval) => {
        return (
          <ToggleButton
            key={interval}
            value={interval}
            sx={{
              px: '14px',
              py: '4px',
              minHeight: 'unset',
              lineHeight: 1,
              ...props.sx?.button,
            }}
          >
            <Typography variant="buttonM">{interval}</Typography>
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
};
