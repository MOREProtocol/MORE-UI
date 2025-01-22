import { EthereumProvider } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';
import { AbstractConnector } from '@web3-react/abstract-connector';
import { ConnectorUpdate } from '@web3-react/types';
import invariant from 'tiny-invariant';

export const URI_AVAILABLE = 'URI_AVAILABLE';

export class UserRejectedRequestError extends Error {
  public constructor() {
    super();
    this.name = this.constructor.name;
    this.message = 'The user rejected the request.';
  }
}

export class FlowWalletConnector extends AbstractConnector {
  public flowWalletProvider?: EthereumProvider;

  constructor(provider: any) {
    super();

    console.log(provider);
    this.flowWalletProvider = provider;

    this.handleChainChanged = this.handleChainChanged.bind(this);
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
  }

  private handleChainChanged(chainId: number | string): void {
    this.emitUpdate({ chainId });
  }

  private handleAccountsChanged(accounts: string[]): void {
    this.emitUpdate({ account: accounts[0] });
  }

  private handleDisconnect(): void {
    this.emitDeactivate();
  }

  private handleDisplayURI = (uri: string): void => {
    this.emit(URI_AVAILABLE, uri);
  };

  public async activate(): Promise<ConnectorUpdate> {
    console.log(this.flowWalletProvider);
    if (!this.flowWalletProvider) {
      throw 'Flow provider not initialized';
    }

    this.flowWalletProvider.on('chainChanged', this.handleChainChanged);
    this.flowWalletProvider.on('accountsChanged', this.handleAccountsChanged);
    this.flowWalletProvider.on('disconnect', this.handleDisconnect);
    this.flowWalletProvider.on('display_uri', this.handleDisplayURI);
    try {
      const accounts = await this.flowWalletProvider.enable();
      const defaultAccount = accounts[0];
      return { provider: this.flowWalletProvider, account: defaultAccount };
    } catch (error) {
      if (error.message === 'Connection request reset. Please try again.') {
        throw new UserRejectedRequestError();
      }
      throw error;
    }
  }

  public async getProvider(): Promise<typeof this.flowWalletProvider> {
    return this.flowWalletProvider;
  }

  public async getChainId(): Promise<number | string> {
    invariant(this.flowWalletProvider, 'FlowwalletProvider should exists when calling getChainId');
    return Promise.resolve(this.flowWalletProvider.chainId);
  }

  public async getAccount(): Promise<null | string> {
    invariant(this.flowWalletProvider, 'FlowwalletProvider should exists when calling getAccount');
    return Promise.resolve(this.flowWalletProvider.accounts).then(
      (accounts: string[]): string => accounts[0]
    );
  }

  public deactivate() {
    if (this.flowWalletProvider) {
      this.flowWalletProvider.removeListener('disconnect', this.handleDisconnect);
      this.flowWalletProvider.removeListener('chainChanged', this.handleChainChanged);
      this.flowWalletProvider.removeListener('accountsChanged', this.handleAccountsChanged);
      this.flowWalletProvider.removeListener('display_uri', this.handleDisplayURI);
      // this.flowWalletProvider.disconnect();

      // this.flowWalletProvider = undefined;
      localStorage.removeItem('walletProvider');
    }
  }

  public async close() {
    this.emitDeactivate();
  }
}
