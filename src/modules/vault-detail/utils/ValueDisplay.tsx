import { styled, Typography } from '@mui/material';
import { compactNumber } from 'src/components/primitives/FormattedNumber';

const MetricValue = styled(Typography)(() => ({
  fontWeight: 600,
  fontSize: '1.25rem',
}));

const SubValue = styled(Typography)(() => ({
  color: '#666',
  fontSize: '0.875rem',
}));

// Dynamic value component that changes color based on the value
const DynamicValue = styled(MetricValue)<{
  value?: number | string;
  isPercentage?: boolean;
}>(({ value, isPercentage }) => {
  // Convert value to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Determine color based on value
  const color =
    !isPercentage || numValue === undefined || numValue === 0
      ? 'inherit'
      : numValue > 0
      ? '#10b981' // green for positive
      : '#ef4444'; // red for negative

  return { color };
});

// Add a wrapper component to handle the display logic
interface ValueDisplayProps {
  value?: number | string;
  valueVisibleDecimals?: number;
  isPercentage?: boolean;
  suffix?: string;
  subValue?: number | string;
  subValueSuffix?: string;
  children?: React.ReactNode;
}

export const ValueDisplay: React.FC<ValueDisplayProps> = ({
  value,
  valueVisibleDecimals = 2,
  isPercentage = false,
  suffix = '',
  subValue,
  subValueSuffix,
  children,
}) => {
  let displayValue: string | React.ReactNode;
  let subValueDisplay: string | React.ReactNode;
  if (typeof value === 'number') {
    const { prefix, postfix } = compactNumber({
      value,
      visibleDecimals: valueVisibleDecimals,
      roundDown: true,
    });
    displayValue = `${prefix}${postfix}`;
  } else {
    displayValue = children || value;
  }
  if (typeof subValue === 'number') {
    const { prefix, postfix } = compactNumber({
      value: subValue,
      visibleDecimals: valueVisibleDecimals,
      roundDown: true,
    });
    subValueDisplay = `${prefix}${postfix}`;
  } else {
    subValueDisplay = children || subValue;
  }

  return (
    <DynamicValue value={value} isPercentage={isPercentage}>
      {displayValue}
      {isPercentage && displayValue !== undefined ? '%' : ` ${suffix}`}
      {subValue && (
        <SubValue>
          {subValueDisplay} {subValueSuffix && ` ${subValueSuffix}`}
        </SubValue>
      )}
    </DynamicValue>
  );
};
