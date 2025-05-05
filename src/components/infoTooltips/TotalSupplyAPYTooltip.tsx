import { TextWithTooltip, TextWithTooltipProps } from '../TextWithTooltip';

export const TotalSupplyAPYTooltip = ({ ...rest }: TextWithTooltipProps) => {
  return (
    <TextWithTooltip {...rest}>
      <>{'The weighted average of APY for all supplied assets, including incentives.'}</>
    </TextWithTooltip>
  );
};
