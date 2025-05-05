import { getFrozenProposalLink } from '../infoTooltips/FrozenTooltip';
import { Link } from '../primitives/Link';

export const BorrowDisabledWarning = () => {
  return (
    <>
      {'Borrowing is disabled due to an More community decision. '}
      <Link
        href={getFrozenProposalLink()}
        sx={{ textDecoration: 'underline' }}
      >
        More details
      </Link>
    </>
  );
};
