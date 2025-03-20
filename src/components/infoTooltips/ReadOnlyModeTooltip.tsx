import { TextWithTooltip, TextWithTooltipProps } from '../TextWithTooltip';

export const ReadOnlyModeTooltip = ({ ...rest }: TextWithTooltipProps) => {
  return (
    <TextWithTooltip {...rest}>
      <>
        {
          'Read-only mode allows to see address positions in Aave, but you won&apos;t be able to perform transactions.'
        }
      </>
    </TextWithTooltip>
  );
};
