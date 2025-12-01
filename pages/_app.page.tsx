'use client';

import '/public/fonts/inter/inter.css';
import '/src/styles/variables.css';
import '@rainbow-me/rainbowkit/styles.css';

import { CacheProvider, EmotionCache } from '@emotion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Web3ReactProvider } from '@web3-react/core';
import { providers } from 'ethers';
import { NextPage } from 'next';
import { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { ReactNode, useEffect, useState } from 'react';
import { AddressBlocked } from 'src/components/AddressBlocked';
import { SanctionRegion } from "src/components/SanctionRegion";
import { Meta as DefaultMeta } from 'src/components/Meta/Meta';
import { Meta as FlowMeta } from 'src/components/Meta/MetaFlow';
import { TransactionEventHandler } from 'src/components/TransactionEventHandler';
import { GasStationProvider } from 'src/components/transactions/GasStation/GasStationProvider';
import { AppDataProvider } from 'src/hooks/app-data-provider/useAppDataProvider';
import { ModalContextProvider } from 'src/hooks/useModal';
import { VaultProvider } from 'src/hooks/vault/useVault';
import { Web3ContextProvider } from 'src/libs/web3-data-provider/Web3Provider';
import { useRootStore } from 'src/store/root';
import { SharedDependenciesProvider } from 'src/ui-config/SharedDependenciesProvider';
import { config as wagmiConfig } from 'src/utils/wagmi';
import { WagmiProvider } from 'wagmi';

import createEmotionCache from '../src/createEmotionCache';
import { AppGlobalStyles } from '../src/layouts/AppGlobalStyles';

const SwitchModal = dynamic(() =>
  import('src/components/transactions/Switch/SwitchModal').then((module) => module.SwitchModal)
);
const BorrowModal = dynamic(() =>
  import('src/components/transactions/Borrow/BorrowModal').then((module) => module.BorrowModal)
);
const ClaimRewardsModal = dynamic(() =>
  import('src/components/transactions/ClaimRewards/ClaimRewardsModal').then(
    (module) => module.ClaimRewardsModal
  )
);
const CollateralChangeModal = dynamic(() =>
  import('src/components/transactions/CollateralChange/CollateralChangeModal').then(
    (module) => module.CollateralChangeModal
  )
);
const DebtSwitchModal = dynamic(() =>
  import('src/components/transactions/DebtSwitch/DebtSwitchModal').then(
    (module) => module.DebtSwitchModal
  )
);
const RateSwitchModal = dynamic(() =>
  import('src/components/transactions/RateSwitch/RateSwitchModal').then(
    (module) => module.RateSwitchModal
  )
);
const EmodeModal = dynamic(() =>
  import('src/components/transactions/Emode/EmodeModal').then((module) => module.EmodeModal)
);
const FaucetModal = dynamic(() =>
  import('src/components/transactions/Faucet/FaucetModal').then((module) => module.FaucetModal)
);
const RepayModal = dynamic(() =>
  import('src/components/transactions/Repay/RepayModal').then((module) => module.RepayModal)
);
const SupplyModal = dynamic(() =>
  import('src/components/transactions/Supply/SupplyModal').then((module) => module.SupplyModal)
);
const SwapModal = dynamic(() =>
  import('src/components/transactions/Swap/SwapModal').then((module) => module.SwapModal)
);
const WithdrawModal = dynamic(() =>
  import('src/components/transactions/Withdraw/WithdrawModal').then(
    (module) => module.WithdrawModal
  )
);

// Preventing SSR issues with RainbowKitProvider
const RainbowKitProvider = dynamic(
  () => import('@rainbow-me/rainbowkit').then((module) => module.RainbowKitProvider),
  {
    ssr: false,
  }
);

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getWeb3Library(provider: any): providers.Web3Provider {
  const library = new providers.Web3Provider(provider);
  library.pollingInterval = 12000;
  return library;
}

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
  Component: NextPageWithLayout;
}
export default function MyApp(props: MyAppProps) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;
  const getLayout = Component.getLayout ?? ((page: ReactNode) => page);
  const initializeMixpanel = useRootStore((store) => store.initializeMixpanel);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL;
  useEffect(() => {
    if (MIXPANEL_TOKEN) {
      initializeMixpanel();
    }
  }, [MIXPANEL_TOKEN, initializeMixpanel]);

  return (
    <CacheProvider value={emotionCache}>
      {process.env.NEXT_PUBLIC_UI_THEME === 'flow' ? <FlowMeta /> : <DefaultMeta />}
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <Web3ReactProvider getLibrary={getWeb3Library}>
              <Web3ContextProvider>
                <AppGlobalStyles>
                  <ModalContextProvider>
                    <SharedDependenciesProvider>
                      <AppDataProvider>
                        <VaultProvider>
                          <GasStationProvider>
                            <SanctionRegion>
                              <AddressBlocked>
                                {getLayout(<Component {...pageProps} />)}
                                <SupplyModal />
                                <WithdrawModal />
                                <BorrowModal />
                                <RepayModal />
                                <CollateralChangeModal />
                                <DebtSwitchModal />
                                <RateSwitchModal />
                                <ClaimRewardsModal />
                                <EmodeModal />
                                <SwapModal />
                                <FaucetModal />
                                <TransactionEventHandler />
                                <SwitchModal />
                              </AddressBlocked>
                            </SanctionRegion>
                          </GasStationProvider>
                        </VaultProvider>
                      </AppDataProvider>
                    </SharedDependenciesProvider>
                  </ModalContextProvider>
                </AppGlobalStyles>
              </Web3ContextProvider>
            </Web3ReactProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </CacheProvider>
  );
}
