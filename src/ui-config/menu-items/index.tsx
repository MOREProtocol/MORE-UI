// import { BookOpenIcon, CreditCardIcon, QuestionMarkCircleIcon } from '@heroicons/react/outline';
import { ReactNode } from 'react';

import { MarketDataType } from '../marketsConfig';

interface Navigation {
  link: string;
  title: string;
  isVisible?: (data: MarketDataType) => boolean | undefined;
  dataCy?: string;
}
interface MoreMenuItem extends Navigation {
  icon: ReactNode;
  makeLink?: (walletAddress: string) => string;
}

const moreMenuItems: MoreMenuItem[] = [
  // TODO: put More doc link
  // {
  //   link: 'https://docs.aave.com/faq/',
  //   title: 'FAQ',
  //   icon: <QuestionMarkCircleIcon />,
  // },
];

// const fiatEnabled = process.env.NEXT_PUBLIC_FIAT_ON_RAMP;
// if (fiatEnabled === 'true') {
//   moreMenuItems.push({
//     link: 'https://global.transak.com',
//     makeLink: (walletAddress) =>
//       `${process.env.NEXT_PUBLIC_TRANSAK_APP_URL}/?apiKey=${process.env.NEXT_PUBLIC_TRANSAK_API_KEY}&walletAddress=${walletAddress}&disableWalletAddressForm=true`,
//     title: `Buy Crypto With Fiat`,
//     icon: <CreditCardIcon />,
//   });
// }
export const moreNavigation: MoreMenuItem[] = [...moreMenuItems];
