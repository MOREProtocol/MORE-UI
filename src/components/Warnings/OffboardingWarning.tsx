import { CustomMarket } from 'src/ui-config/marketsConfig';

import { Link } from '../primitives/Link';

export const AssetsBeingOffboarded: { [market: string]: { [symbol: string]: string } } = {
  [CustomMarket.proto_flow_v3]: {},
};

export const OffboardingWarning = ({ discussionLink }: { discussionLink: string }) => {
  return (
    <>
      {'This asset is planned to be offboarded due to an Aave Protocol Governance decision. '}
      <Link href={discussionLink} sx={{ textDecoration: 'underline' }}>
        More details
      </Link>
    </>
  );
};
