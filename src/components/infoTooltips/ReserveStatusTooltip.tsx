import { FrozenTooltip } from './FrozenTooltip';
import { PausedTooltip } from './PausedTooltip';

interface ReserveStatusTooltipProps {
  reserve?: { isFrozen: boolean; isPaused: boolean };
}

/** Red warning icon (with explanation tooltip) shown next to a frozen or paused asset. */
export const ReserveStatusTooltip = ({ reserve }: ReserveStatusTooltipProps) => {
  if (reserve?.isPaused) return <PausedTooltip />;
  if (reserve?.isFrozen) return <FrozenTooltip />;
  return null;
};
