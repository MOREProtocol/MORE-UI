import { TextWithTooltip, TextWithTooltipProps } from '../TextWithTooltip';

export const VariableAPYTooltip = ({ ...rest }: TextWithTooltipProps) => {
  return (
    <TextWithTooltip {...rest}>
      <>
        {
          'Variable interest rate will fluctuate based on the market conditions. Recommended for short-term positions.'
        }
      </>
    </TextWithTooltip>
  );
};
