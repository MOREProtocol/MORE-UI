import { getFrozenProposalLink } from '../infoTooltips/FrozenTooltip';
import { Link } from '../primitives/Link';

interface BorrowDisabledWarningProps {
  symbol: string;
  currentMarket: string;
}
export const BorrowDisabledWarning = ({ symbol, currentMarket }: BorrowDisabledWarningProps) => {
  return (
    <>
      {'Borrowing is disabled due to an Aave community decision. '}
      <Link
        href={getFrozenProposalLink(symbol, currentMarket)}
        sx={{ textDecoration: 'underline' }}
      >
        More details
      </Link>
    </>
  );
};
