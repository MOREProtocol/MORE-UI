import { ReserveDataHumanized } from '@aave/contract-helpers';
import { UserReserveData } from '@aave/math-utils';
import React, { useContext } from 'react';
import { EmodeCategory, IProps } from 'src/helpers/types';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { allMarketsData, MarketDataType } from 'src/ui-config/marketsConfig';

import { formatEmodes } from '../../store/poolSelectors';
import {
  ExtendedFormattedUser as _ExtendedFormattedUser,
  useExtendedUserSummaryAndIncentives,
} from '../pool/useExtendedUserSummaryAndIncentives';
import {
  FormattedReservesAndIncentives,
  usePoolsFormattedReserves,
} from '../pool/usePoolFormattedReserves';
import { usePoolsReservesHumanized } from '../pool/usePoolReserves';
import { useUserPoolReservesHumanized } from '../pool/useUserPoolReserves';
import { FormattedUserReserves } from '../pool/useUserSummaryAndIncentives';

/**
 * removes the marketPrefix from a symbol
 * @param symbol
 * @param prefix
 */
export const unPrefixSymbol = (symbol: string, prefix: string) => {
  return symbol.toUpperCase().replace(RegExp(`^(${prefix[0]}?${prefix.slice(1)})`), '');
};

/**
 * @deprecated Use FormattedReservesAndIncentives type from usePoolFormattedReserves hook
 */
export type ComputedReserveData = FormattedReservesAndIncentives;

export type ComputedReserveDataWithMarket = FormattedReservesAndIncentives & {
  market: MarketDataType;
};

/**
 * @deprecated Use FormattedUserReserves type from useUserSummaryAndIncentives hook
 */
export type ComputedUserReserveData = FormattedUserReserves;

/**
 * @deprecated Use ExtendedFormattedUser type from useExtendedUserSummaryAndIncentives hook
 */
export type ExtendedFormattedUser = _ExtendedFormattedUser;

export interface AppDataContextType {
  loading: boolean;
  reserves: ComputedReserveDataWithMarket[];
  eModes: Record<number, EmodeCategory>;
  user?: ExtendedFormattedUser;
  marketReferencePriceInUsd: string;
  marketReferenceCurrencyDecimals: number;
  userReserves: UserReserveData[];
}

const AppDataContext = React.createContext<AppDataContextType>({} as AppDataContextType);

/**
 * This is the only provider you'll ever need.
 * It fetches reserves /incentives & walletbalances & keeps them updated.
 */
export const AppDataProvider: React.FC<IProps> = ({ children }) => {
  const { currentAccount } = useWeb3Context();

  const { currentMarket, currentMarketData } = useRootStore();
  // pool hooks

  const localMarketData = currentMarket === 'all_markets' ? allMarketsData : [currentMarketData];

  const poolsReservesHumanized = usePoolsReservesHumanized(localMarketData);
  const reservesDataLoading = poolsReservesHumanized.some((r) => r.isLoading);
  const reservesData: (ReserveDataHumanized & { market: MarketDataType })[] =
    !reservesDataLoading &&
    poolsReservesHumanized
      .map((r, index) =>
        r.data.reservesData.map((reserve) => ({
          ...reserve,
          market: localMarketData[index],
        }))
      )
      .flat();

  const poolsFormattedReserves = usePoolsFormattedReserves(localMarketData);
  const formattedPoolReservesLoading = poolsFormattedReserves.some((r) => r.isLoading);
  const formattedPoolReserves: (FormattedReservesAndIncentives & { market: MarketDataType })[] =
    !formattedPoolReservesLoading &&
    poolsFormattedReserves
      .map((r, index) =>
        r.data.map((reserve) => ({
          ...reserve,
          market: localMarketData[index],
        }))
      )
      .flat();

  const baseCurrencyData = !reservesDataLoading && poolsReservesHumanized[0]?.data.baseCurrencyData;
  // user hooks

  const eModes = reservesData ? formatEmodes(reservesData) : {};

  const { data: userReservesData, isLoading: userReservesDataLoading } =
    useUserPoolReservesHumanized(currentMarketData);
  const { data: userSummary, isLoading: userSummaryLoading } =
    useExtendedUserSummaryAndIncentives(currentMarketData);
  const userReserves = userReservesData?.userReserves;

  // loading
  const isReservesLoading = reservesDataLoading || formattedPoolReservesLoading;
  const isUserDataLoading = userReservesDataLoading || userSummaryLoading;

  const user = userSummary;
  // Factor discounted GHO interest into cumulative user fields

  return (
    <AppDataContext.Provider
      value={{
        loading: isReservesLoading || (!!currentAccount && isUserDataLoading),
        reserves: formattedPoolReserves || [],
        eModes,
        user,
        userReserves: userReserves || [],
        marketReferencePriceInUsd: baseCurrencyData?.marketReferenceCurrencyPriceInUsd || '0',
        marketReferenceCurrencyDecimals: baseCurrencyData?.marketReferenceCurrencyDecimals || 0,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppDataContext = () => useContext(AppDataContext);
