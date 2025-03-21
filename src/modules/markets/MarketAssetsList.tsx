import { useMediaQuery } from '@mui/material';
import { useMemo, useState } from 'react';
import { VariableAPYTooltip } from 'src/components/infoTooltips/VariableAPYTooltip';
import { ListColumn } from 'src/components/lists/ListColumn';
import { ListHeaderTitle } from 'src/components/lists/ListHeaderTitle';
import { ListHeaderWrapper } from 'src/components/lists/ListHeaderWrapper';
import { ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';
import { WalletBalancesMap } from 'src/hooks/app-data-provider/useWalletBalances';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';

import { MarketAssetsListItem } from './MarketAssetsListItem';
import { MarketAssetsListItemLoader } from './MarketAssetsListItemLoader';
import { MarketAssetsListMobileItem } from './MarketAssetsListMobileItem';
import { MarketAssetsListMobileItemLoader } from './MarketAssetsListMobileItemLoader';
import { useRootStore } from 'src/store/root';

const listHeaders = [
  {
    title: 'Asset',
    sortKey: 'symbol',
  },
  {
    title: 'Total supplied',
    sortKey: 'totalLiquidityUSD',
  },
  {
    title: 'Supply APY',
    sortKey: 'supplyAPY',
  },
  {
    title: 'Total borrowed',
    sortKey: 'totalDebtUSD',
  },
  {
    title: (
      <VariableAPYTooltip
        text={'Borrow APY, variable'}
        key="APY_list_variable_type"
        variant="subheader2"
      />
    ),
    sortKey: 'variableBorrowAPY',
  },
  // {
  //   title: (
  //     <StableAPYTooltip
  //       text={Borrow APY, stable}
  //       key="APY_list_stable_type"
  //       variant="subheader2"
  //     />
  //   ),
  //   sortKey: 'stableBorrowAPY',
  // },
];

type MarketAssetsListProps = {
  reserves: ComputedReserveDataWithMarket[];
  loading: boolean;
  walletBalances: WalletBalancesMap;
};

export default function MarketAssetsList({
  reserves,
  loading,
  walletBalances,
}: MarketAssetsListProps) {
  const { currentAccount } = useWeb3Context();
  const { currentMarket } = useRootStore()
  const lastColumnSize = useMemo(() => (!!currentAccount && currentMarket !== 'all_markets' ? 180 : 95), [currentAccount, currentMarket]);
  const isTableChangedToCards = useMediaQuery('(max-width:1125px)');
  const [sortName, setSortName] = useState('');
  const [sortDesc, setSortDesc] = useState(false);
  if (sortDesc) {
    if (sortName === 'symbol') {
      reserves.sort((a, b) => (a.symbol.toUpperCase() < b.symbol.toUpperCase() ? -1 : 1));
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      reserves.sort((a, b) => a[sortName] - b[sortName]);
    }
  } else {
    if (sortName === 'symbol') {
      reserves.sort((a, b) => (b.symbol.toUpperCase() < a.symbol.toUpperCase() ? -1 : 1));
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      reserves.sort((a, b) => b[sortName] - a[sortName]);
    }
  }

  // Show loading state when loading
  if (loading) {
    return isTableChangedToCards ? (
      <>
        <MarketAssetsListMobileItemLoader />
        <MarketAssetsListMobileItemLoader />
        <MarketAssetsListMobileItemLoader />
      </>
    ) : (
      <>
        <MarketAssetsListItemLoader />
        <MarketAssetsListItemLoader />
        <MarketAssetsListItemLoader />
        <MarketAssetsListItemLoader />
      </>
    );
  }

  // Hide list when no results, via search term or if a market has all/no frozen/unfrozen assets
  if (reserves.length === 0) return null;

  return (
    <>
      {!isTableChangedToCards && (
        <ListHeaderWrapper px={6}>
          {listHeaders.map((col) => (
            <ListColumn
              isRow={col.sortKey === 'symbol'}
              maxWidth={col.sortKey === 'symbol' ? 280 : undefined}
              key={col.sortKey}
            >
              <ListHeaderTitle
                sortName={sortName}
                sortDesc={sortDesc}
                setSortName={setSortName}
                setSortDesc={setSortDesc}
                sortKey={col.sortKey}
                source="Markets Page"
              >
                {col.title}
              </ListHeaderTitle>
            </ListColumn>
          ))}
          {/* Width for buttons */}
            <ListColumn maxWidth={lastColumnSize} minWidth={lastColumnSize} />
        </ListHeaderWrapper>
      )}

      {reserves.map((reserve) =>
        isTableChangedToCards ? (
          <MarketAssetsListMobileItem {...reserve} key={reserve.id} />
        ) : (
          <MarketAssetsListItem
            reserve={reserve}
            key={reserve.id}
            walletBalances={walletBalances}
          />
        )
      )}
    </>
  );
}
