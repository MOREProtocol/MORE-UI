import { styled, ToggleButtonGroup, ToggleButtonGroupProps } from '@mui/material';

// Colors/shape/padding now come from the theme-level MuiToggleButtonGroup
// segmented style (see src/utils/theme.tsx). Defer to it here.
const CustomToggleGroup = styled(ToggleButtonGroup)<ToggleButtonGroupProps>(
  {}
) as typeof ToggleButtonGroup;

// Keep only structural sizing for the in-modal group.
const CustomTxModalToggleGroup = styled(ToggleButtonGroup)<ToggleButtonGroupProps>({
  height: '36px',
  width: '100%',
}) as typeof ToggleButtonGroup;

export function StyledTxModalToggleGroup(props: ToggleButtonGroupProps) {
  return <CustomTxModalToggleGroup {...props} />;
}

export default function StyledToggleGroup(props: ToggleButtonGroupProps) {
  return <CustomToggleGroup {...props} />;
}
