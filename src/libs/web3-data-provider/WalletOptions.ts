import { ChainId } from '@aave/contract-helpers';
import { AbstractConnector } from '@web3-react/abstract-connector';
import { InjectedConnector } from '@web3-react/injected-connector';
import { ConnectorUpdate } from '@web3-react/types';

// import { LedgerHQFrameConnector } from 'web3-ledgerhq-frame-connector';
import { WalletConnectConnector } from './WalletConnectConnector';

export enum WalletType {
  INJECTED = 'injected',
  FLOW_WALLET = 'flow_wallet',
  WALLET_CONNECT = 'wallet_connect',
  READ_ONLY_MODE = 'read_only_mode',
}

const mockProvider = {
  request: Promise.resolve(null),
};

/**
 *  This is a connector to be used in read-only mode.
 *  On activate, the connector expects a local storage item called `readOnlyModeAddress` to be set, otherwise an error is thrown.
 *  When the connector is deactivated (i.e. on disconnect, switching wallets), the local storage item is removed.
 */
export class ReadOnlyModeConnector extends AbstractConnector {
  readAddress = '';

  activate(): Promise<ConnectorUpdate<string | number>> {
    const address = localStorage.getItem('readOnlyModeAddress');
    if (!address || address === 'undefined') {
      throw new Error('No address found in local storage for read-only mode');
    }

    this.readAddress = address;

    return Promise.resolve({
      provider: mockProvider,
      chainId: ChainId.mainnet,
      account: this.readAddress,
    });
  }
  getProvider(): Promise<unknown> {
    return Promise.resolve(mockProvider);
  }
  getChainId(): Promise<string | number> {
    return Promise.resolve(ChainId.mainnet);
  }
  getAccount(): Promise<string | null> {
    return Promise.resolve(this.readAddress);
  }
  deactivate(): void {
    const storedReadAddress = localStorage.getItem('readOnlyModeAddress');
    if (storedReadAddress === this.readAddress) {
      // Only update local storage if the address is the same as the one this connector stored.
      // This will be different if the user switches to another account to observe because
      // the new connector gets initialized before this one is deactivated.
      localStorage.removeItem('readOnlyModeAddress');
    }
  }
}

export const getWallet = (
  wallet: WalletType,
  currentChainId: ChainId = ChainId.mainnet
): AbstractConnector => {
  switch (wallet) {
    case WalletType.READ_ONLY_MODE:
      return new ReadOnlyModeConnector();
    // case WalletType.LEDGER:
    //   return new LedgerHQFrameConnector({});
    case WalletType.INJECTED:
      return new InjectedConnector({});
    case WalletType.WALLET_CONNECT:
      return new WalletConnectConnector(currentChainId);
    default: {
      throw new Error(`unsupported wallet`);
    }
  }
};
