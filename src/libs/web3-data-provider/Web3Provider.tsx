import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { API_ETH_MOCK_ADDRESS, ERC20Service, transactionType } from '@aave/contract-helpers';
import { SignatureLike } from '@ethersproject/bytes';
import { TransactionResponse, Provider } from '@ethersproject/providers';
import { useAccount, useProvider, useSigner, useSwitchNetwork, useChainId } from 'wagmi';
import { useWeb3React } from '@web3-react/core';
import { BigNumber, PopulatedTransaction, providers } from 'ethers';
import { useRootStore } from 'src/store/root';
import { hexToAscii } from 'src/utils/utils';
import { Web3Context } from 'src/libs/hooks/useWeb3Context';
import { WalletType } from './WalletOptions';

export type ERC20TokenType = {
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
  aToken?: boolean;
};

export type Web3Data = {
  connectWallet: (wallet: WalletType) => Promise<void>;
  disconnectWallet: () => void;
  currentAccount: string;
  connected: boolean;
  loading: boolean;
  provider: Provider | undefined;
  chainId: number;
  switchNetwork: (chainId: number) => Promise<void>;
  getTxError: (txHash: string) => Promise<string>;
  sendTx: (txData: transactionType | PopulatedTransaction) => Promise<TransactionResponse>;
  addERC20Token: (args: ERC20TokenType) => Promise<boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTxData: (unsignedData: string) => Promise<SignatureLike>;
  error: Error | undefined;
  switchNetworkError: Error | undefined;
  setSwitchNetworkError: (err: Error | undefined) => void;
  readOnlyModeAddress: string | undefined;
  readOnlyMode: boolean;
};

export const Web3ContextProvider: React.FC<{ children: ReactElement }> = ({ children }) => {
  const chainId = useChainId();
  const provider = useProvider();
  const { data: signer } = useSigner();
  const { address, isConnected } = useAccount();
  const { switchNetwork: switchNetworkFunc } = useSwitchNetwork();

  const { error } = useWeb3React<providers.Web3Provider>();

  const [loading, setLoading] = useState(false);
  const [switchNetworkError, setSwitchNetworkError] = useState<Error>();
  const [setAccount] = useRootStore((store) => [store.setAccount]);
  const setAccountLoading = useRootStore((store) => store.setAccountLoading);

  // TODO: we use from instead of currentAccount because of the mock wallet.
  // If we used current account then the tx could get executed
  const sendTx = async (
    txData: transactionType | PopulatedTransaction
  ): Promise<TransactionResponse> => {
    if (provider && signer) {
      setLoading(true);
      const { from, ...data } = txData;
      const txResponse: TransactionResponse = await signer.sendTransaction({
        ...data,
        value: data.value ? BigNumber.from(data.value) : undefined,
      });
      setLoading(false);
      return txResponse;
    }
    throw new Error('Error sending transaction. Provider not found');
  };

  // TODO: recheck that it works on all wallets
  const signTxData = async (unsignedData: string): Promise<SignatureLike> => {
    if (provider && signer) {
      return await signer.signMessage(unsignedData);
    }
    throw new Error('Error initializing permit signature');
  };

  const switchNetwork = async (newChainId: number) => {
    if (provider && switchNetworkFunc) {
      try {
        switchNetworkFunc(newChainId);
        setSwitchNetworkError(undefined);
      } catch (switchError) {
        setSwitchNetworkError(switchError);
      }
    }
  };

  const getTxError = async (txHash: string): Promise<string> => {
    if (provider) {
      const tx = await provider.getTransaction(txHash);
      // @ts-expect-error TODO: need think about "tx" type
      const code = await provider.call(tx, tx.blockNumber);
      const error = hexToAscii(code.substr(138));
      return error;
    }
    throw new Error('Error getting transaction. Provider not found');
  };

  const addERC20Token = async ({
    address,
    symbol,
    decimals,
    image,
  }: ERC20TokenType): Promise<boolean> => {
    // using window.ethereum as looks like its only supported for metamask
    // and didn't manage to make the call with ethersjs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const injectedProvider = (window as any).ethereum;
    if (provider && address && window && injectedProvider) {
      if (address.toLowerCase() !== API_ETH_MOCK_ADDRESS.toLowerCase()) {
        let tokenSymbol = symbol;
        if (!tokenSymbol) {
          const { getTokenData } = new ERC20Service(provider);
          const { symbol } = await getTokenData(address);
          tokenSymbol = symbol;
        }

        await injectedProvider.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address,
              symbol: tokenSymbol,
              decimals,
              image,
            },
          },
        });

        return true;
      }
    }
    return false;
  };

  const connectWallet = useCallback(async (wallet: WalletType) => {
    console.log(wallet);
  }, []);

  const disconnectWallet = useCallback(async () => {}, []);

  // inject account into zustand as long as aave itnerface is using old web3 providers
  useEffect(() => {
    setAccount(address?.toLowerCase());
  }, [address]);

  useEffect(() => {
    setAccountLoading(loading);
  }, [loading]);

  return (
    <Web3Context.Provider
      value={{
        web3ProviderData: {
          connectWallet,
          disconnectWallet,
          provider,
          connected: isConnected,
          loading,
          chainId: chainId || 1,
          switchNetwork,
          getTxError,
          sendTx,
          signTxData,
          currentAccount: address?.toLowerCase() || '',
          addERC20Token,
          error,
          switchNetworkError,
          setSwitchNetworkError,
          readOnlyModeAddress: undefined,
          readOnlyMode: false,
        },
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
