import { Trans } from '@lingui/react/macro';

import { TextWithTooltip, TextWithTooltipProps } from '../TextWithTooltip';

export const BorrowPowerTooltip = ({ ...rest }: TextWithTooltipProps) => {
  return (
    <TextWithTooltip {...rest}>
      <Trans>
        The % of your loan compared to your total collateral value. A higher LTV means more risk of
        liquidation if your collateral drops in value.
      </Trans>
    </TextWithTooltip>
  );
};
