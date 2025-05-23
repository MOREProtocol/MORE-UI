import { TextWithTooltip, TextWithTooltipProps } from '../TextWithTooltip';

export const CollateralSwitchTooltip = ({ ...rest }: TextWithTooltipProps) => {
  return (
    <TextWithTooltip {...rest}>
      <>
        {
          'Allows you to decide whether to use a supplied asset as collateral. An asset used as collateral will affect your borrowing power and health factor.'
        }
      </>
    </TextWithTooltip>
  );
};
