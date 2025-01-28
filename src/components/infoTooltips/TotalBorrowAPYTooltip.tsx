import { Trans } from "@lingui/react/macro";

import { TextWithTooltip, TextWithTooltipProps } from '../TextWithTooltip';

export const TotalBorrowAPYTooltip = ({ ...rest }: TextWithTooltipProps) => {
  return (
    <TextWithTooltip {...rest}>
      <Trans>The weighted average of APY for all borrowed assets, including incentives.</Trans>
    </TextWithTooltip>
  );
};
