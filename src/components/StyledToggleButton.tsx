import { styled, ToggleButton, ToggleButtonProps } from '@mui/material';
import React from 'react';

// Colors/shape now come from the theme-level MuiToggleButton segmented style
// (see src/utils/theme.tsx). Keep only the structural bit: buttons flex to
// fill the group evenly.
const CustomToggleButton = styled(ToggleButton)<ToggleButtonProps>({
  flex: 1,
}) as unknown as typeof ToggleButton;

const CustomTxModalToggleButton = styled(ToggleButton)<ToggleButtonProps>({
  flex: 1,
}) as unknown as typeof ToggleButton;

export function StyledTxModalToggleButton(props: ToggleButtonProps) {
  return <CustomTxModalToggleButton {...props} />;
}

export default function StyledToggleButton(props: ToggleButtonProps) {
  return <CustomToggleButton {...props} />;
}
