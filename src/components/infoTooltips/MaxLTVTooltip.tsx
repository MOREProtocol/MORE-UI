import { TextWithTooltip, TextWithTooltipProps } from '../TextWithTooltip';

export const MaxLTVTooltip = ({ ...rest }: TextWithTooltipProps) => {
  return (
    <TextWithTooltip {...rest}>
      <>
        {
          'The Maximum LTV ratio represents the maximum borrowing power of a specific collateral. For example, if a collateral has an LTV of 75%, the user can borrow up to 0.75 worth of FLOW in the principal currency for every 1 FLOW worth of collateral.'
        }
      </>
    </TextWithTooltip>
  );
};
