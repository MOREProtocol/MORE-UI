import { ethers } from 'ethers';
import { useRouter } from 'next/router';
import React, {
  createContext,
  JSX,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Action,
  Facet,
  TransactionInput,
} from 'src/modules/vault-detail/VaultManagement/facets/types';
import { ChainIds } from 'src/utils/const';
import { useWalletClient, useChainId } from 'wagmi';

import { useVaultProvider } from './useVaultData';

// Define standardized types for monetary values
export interface MonetaryValue {
  value: number | string; // Numeric value
  currency: string; // The currency symbol or address
}

// Define fee structure
export interface Fee {
  percentage: number; // Fee percentage as a number (e.g., 0.25)
  recipient: string; // Address of the fee recipient
}

// Define roles in the vault
export interface VaultRoles {
  owner?: string;
  curator?: string;
  guardian?: string;
}

// Define the complete vault data structure
export interface VaultData {
  id: string;
  chainId?: number; // Network where the vault actually exists
  overview: {
    name?: string;
    description?: string;
    curatorLogo?: string;
    curatorName?: string;
    asset?: {
      symbol?: string;
      decimals?: number;
      address?: string;
    };
    sharePrice?: number;
    roles?: VaultRoles;
    apy?: number;
    historicalSnapshots?: {
      apy: { time: string; value: number }[];
      totalSupply: { time: string; value: number }[];
    };
    withdrawalTimelock?: string;
    fee?: string;
    creationTimestamp?: string;
    decimals?: number;
    symbol?: string;
  };
  financials?: {
    fees?: {
      performance: Fee;
      management: Fee;
      network: Fee;
    };
    liquidity?: {
      maxDeposit?: string;
      totalAssets?: string;
      totalSupply?: string;
      depositCapacity?: string;
    };
  };
  activity?: {
    timestamp: Date;
    market: string;
    assetSymbol: string;
    assetName: string;
    assetAddress: string;
    amount?: number | string;
    price?: number | string;
    type: string;
    transactionHash: string;
    user: string;
  }[];
  incentives?: {
    id: number;
    name: string;
    start_timestamp: number;
    end_timestamp: number;
    reward_token_address: string;
    total_reward_amount_wei: string;
    tracked_token_address: string;
    tracked_token_type: "supply" | "borrow" | "supply_and_borrow";
    created_at: number;
    reward_token_symbol: string;
    apy_bps: number;
  }[];
}

// Define the tabs for your vault page
export type VaultTab = 'overview' | 'financials' | 'allocations' | 'activity' | 'manage';

interface VaultBatchTransaction {
  id: string;
  action: Action;
  facet: Facet;
  inputs: TransactionInput;
}

// Define the context data structure
export interface VaultContextData {
  // Network context
  chainId: number;
  signer: ethers.Signer | null;
  network: string;

  // Info reading
  selectedVaultId: string | null;
  setSelectedVaultId: (vaultId: string) => void;
  getVaultAssetBalance: (assetAddress: string) => Promise<string>;

  // Operations
  isDrawerOpen: boolean;
  setIsDrawerOpen: (value: boolean) => void;
  accountAddress: string | null;
  transactions: VaultBatchTransaction[];
  nbTransactions: number;
  depositInVault: (amountInWei: string, accountAddress?: string) => Promise<{
    tx: ethers.providers.TransactionRequest;
    action: 'approve' | 'deposit';
  }>;
  withdrawFromVault: (amountInWei: string, accountAddress?: string) => Promise<{
    tx: ethers.providers.TransactionRequest;
  }>;
  requestWithdraw: (amountInWei: string) => Promise<{
    tx: ethers.providers.TransactionRequest;
  }>;
  getWithdrawalRequest: (ownerAddress?: string) => Promise<{
    shares: string;
    timeLockEndsAt: string;
  }>;
  getWithdrawalTimelock: () => Promise<string>;
  convertToAssets: (shares: string) => Promise<string>;
  maxRedeem: (ownerAddress?: string) => Promise<string>;
  requestRedeem: (sharesInWei: string) => Promise<{
    tx: ethers.providers.TransactionRequest;
  }>;
  redeemFromVault: (sharesInWei: string, accountAddress?: string) => Promise<{
    tx: ethers.providers.TransactionRequest;
  }>;
  getDepositWhitelist: (depositorAddress?: string) => Promise<string>;
  isDepositWhitelistEnabled: () => Promise<boolean>;
  enhanceTransactionWithGas: (tx: ethers.providers.TransactionRequest) => Promise<ethers.providers.TransactionRequest>;
  addTransaction: ({
    action,
    facet,
    inputs,
    vault,
  }: Omit<VaultBatchTransaction, 'id'> & { vault: VaultData }) => void;
  removeTransaction: (id: string) => void;
  clearTransactions: () => void;
  getEncodedActions: (transactions: VaultBatchTransaction[]) => Promise<string[]>;
  submitActions: (encodedActions: string[]) => Promise<ethers.providers.TransactionReceipt>;
  submitAndExecuteActions: () => Promise<ethers.providers.TransactionReceipt | undefined>;
  operationsLoading: boolean;
  operationsError: Error | null;
}

// Create the context
const VaultContext = createContext<VaultContextData | undefined>(undefined);

// Create the provider component
export const VaultProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const router = useRouter();
  const { vaultId: selectedVaultIdFromUrl, portfolioId: selectedPortfolioIdFromUrl } = router.query;

  // Info reading state
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

  // Operations state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<VaultBatchTransaction[]>([]);
  const [operationsError, setOperationsError] = useState<Error | null>(null);
  const [operationsLoading, setOperationsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Support both vaultId and portfolioId query parameters
    const idFromUrl = selectedVaultIdFromUrl || selectedPortfolioIdFromUrl;
    if (idFromUrl) {
      setSelectedVaultId(idFromUrl as string);
    }
  }, [selectedVaultIdFromUrl, selectedPortfolioIdFromUrl]);

  // Web3 setup
  const { data: walletClient } = useWalletClient();
  const wagmiChainId = useChainId();

  // Use wagmi chainId (reacts to network changes) with fallback to Flow EVM Mainnet
  const chainId = wagmiChainId || ChainIds.flowEVMMainnet;

  const provider = useVaultProvider(chainId);
  const signer = useMemo(() => {
    if (walletClient && provider) {
      return provider.getSigner();
    }
    return null;
  }, [provider, walletClient]);
  const network = useMemo(() => {
    if (chainId === ChainIds.flowEVMMainnet) {
      return 'mainnet';
    } else if (chainId === ChainIds.flowEVMTestnet) {
      return 'testnet';
    } else {
      return 'invalid';
    }
  }, [chainId]);
  const accountAddress = useMemo(() => walletClient?.account.address, [walletClient]);

  // Use the useVaultAssetBalance hook to get a balance
  const getVaultAssetBalance = useCallback(
    async (assetAddress: string) => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!provider) {
        throw new Error('Provider not available');
      }

      const tokenContract = new ethers.Contract(
        assetAddress,
        [`function balanceOf(address) external view returns (uint256)`],
        provider
      );

      const balance = await tokenContract.balanceOf(selectedVaultId);
      return balance.toString();
    },
    [selectedVaultId, provider]
  );

  // ==================== BUNDLE FUNCTIONS ====================
  const nbTransactions = useMemo(() => transactions.length, [transactions]);

  const depositInVault = useCallback(
    async (amountInWei: string, localAccountAddress = accountAddress): Promise<{
      tx: ethers.providers.TransactionRequest;
      action: 'approve' | 'deposit';
    }> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!localAccountAddress) {
        throw new Error('No account connected');
      }
      if (!signer) {
        throw new Error('No signer available');
      }

      console.log('Depositing', amountInWei);

      // Get the vault contract to check its state
      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function asset() external view returns (address)`,
          `function paused() external view returns (bool)`,
          `function deposit(
            uint256 assets,
            address receiver
          ) external returns (uint256 shares)`,
        ],
        signer
      );

      // Get the token contract for approval
      const assetAddress = await vaultContract.asset();
      const tokenContract = new ethers.Contract(
        assetAddress,
        [
          `function allowance(address owner, address spender) external view returns (uint256)`,
          `function approve(address spender, uint256 amount) external returns (bool)`,
        ],
        signer
      );

      // Check if vault is paused
      const isPaused = await vaultContract.paused();
      if (isPaused) {
        throw new Error('Vault is paused');
      }

      // Check allowance and approve if needed
      const allowance = await tokenContract.allowance(localAccountAddress, selectedVaultId);
      if (allowance.lt(amountInWei)) {
        const approveTx = await tokenContract.populateTransaction.approve(
          selectedVaultId,
          ethers.constants.MaxUint256
        );
        return { tx: approveTx, action: 'approve' };
      }

      try {
        const tx = await vaultContract.populateTransaction.deposit(amountInWei, localAccountAddress);
        return { tx, action: 'deposit' };
      } catch (error) {
        console.error('Deposit failed:', error);
        throw error;
      }
    },
    [selectedVaultId, signer, accountAddress]
  );

  const withdrawFromVault = useCallback(
    async (amountInWei: string, localAccountAddress = accountAddress): Promise<{
      tx: ethers.providers.TransactionRequest;
    }> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }

      // Now attempt the withdraw
      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function asset() external view returns (address)`,
          `function paused() external view returns (bool)`,
          `function withdraw(
            uint256 assets,
            address receiver,
            address owner
        ) external returns (uint256 shares)`,
        ],
        signer
      );

      // Check if vault is paused
      const isPaused = await vaultContract.paused();
      if (isPaused) {
        throw new Error('Vault is paused');
      }

      try {
        const tx = await vaultContract.populateTransaction.withdraw(
          amountInWei,
          localAccountAddress,
          localAccountAddress
        );
        return { tx };
      } catch (error) {
        console.error('Withdrawal failed:', error);
        throw error;
      }
    },
    [selectedVaultId, signer, accountAddress]
  );

  const requestWithdraw = useCallback(
    async (amountInWei: string): Promise<{
      tx: ethers.providers.TransactionRequest;
    }> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!signer) {
        throw new Error('No signer available');
      }

      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function paused() external view returns (bool)`,
          `function requestWithdraw(uint256 _assets) external`,
        ],
        signer
      );

      // Check if vault is paused
      const isPaused = await vaultContract.paused();
      if (isPaused) {
        throw new Error('Vault is paused');
      }

      try {
        const tx = await vaultContract.populateTransaction.requestWithdraw(amountInWei);
        return { tx };
      } catch (error) {
        console.error('Request withdraw failed:', error);
        throw error;
      }
    },
    [selectedVaultId, signer]
  );

  const getWithdrawalRequest = useCallback(
    async (ownerAddress = accountAddress): Promise<{
      shares: string;
      timeLockEndsAt: string;
    }> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!provider) {
        throw new Error('Provider not available');
      }
      if (!ownerAddress) {
        throw new Error('No owner address provided');
      }

      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function getWithdrawalRequest(address owner) external view returns (uint256 shares, uint256 timeLockEndsAt)`,
        ],
        provider
      );

      try {
        const [shares, timeLockEndsAt] = await vaultContract.getWithdrawalRequest(ownerAddress);
        return {
          shares: shares.toString(),
          timeLockEndsAt: timeLockEndsAt.toString(),
        };
      } catch (error) {
        console.error('Get withdrawal request failed:', error);
        throw error;
      }
    },
    [selectedVaultId, provider, accountAddress]
  );

  const getWithdrawalTimelock = useCallback(
    async (): Promise<string> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!provider) {
        throw new Error('Provider not available');
      }

      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function getWithdrawalTimelock() external view returns (uint64)`,
        ],
        provider
      );

      try {
        const timelock = await vaultContract.getWithdrawalTimelock();
        return timelock.toString();
      } catch (error) {
        console.error('Get withdrawal timelock failed:', error);
        throw error;
      }
    },
    [selectedVaultId, provider]
  );

  const convertToAssets = useCallback(
    async (shares: string): Promise<string> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!provider) {
        throw new Error('Provider not available');
      }

      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function convertToAssets(uint256 shares) external view returns (uint256)`,
        ],
        provider
      );

      try {
        const assets = await vaultContract.convertToAssets(shares);
        return assets.toString();
      } catch (error) {
        console.error('Convert to assets failed:', error);
        throw error;
      }
    },
    [selectedVaultId, provider]
  );

  const maxRedeem = useCallback(
    async (ownerAddress = accountAddress): Promise<string> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!provider) {
        throw new Error('Provider not available');
      }
      if (!ownerAddress) {
        throw new Error('No owner address provided');
      }

      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function maxRedeem(address owner) external view returns (uint256)`,
        ],
        provider
      );

      try {
        const maxShares = await vaultContract.maxRedeem(ownerAddress);
        return maxShares.toString();
      } catch (error) {
        console.error('Max redeem failed:', error);
        throw error;
      }
    },
    [selectedVaultId, provider, accountAddress]
  );

  const requestRedeem = useCallback(
    async (sharesInWei: string): Promise<{
      tx: ethers.providers.TransactionRequest;
    }> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!signer) {
        throw new Error('No signer available');
      }

      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function paused() external view returns (bool)`,
          `function requestRedeem(uint256 _shares) external`,
        ],
        signer
      );

      // Check if vault is paused
      const isPaused = await vaultContract.paused();
      if (isPaused) {
        throw new Error('Vault is paused');
      }

      try {
        const tx = await vaultContract.populateTransaction.requestRedeem(sharesInWei);
        return { tx };
      } catch (error) {
        console.error('Request redeem failed:', error);
        throw error;
      }
    },
    [selectedVaultId, signer]
  );

  const redeemFromVault = useCallback(
    async (sharesInWei: string, localAccountAddress = accountAddress): Promise<{
      tx: ethers.providers.TransactionRequest;
    }> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!localAccountAddress) {
        throw new Error('No account connected');
      }
      if (!signer) {
        throw new Error('No signer available');
      }

      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function paused() external view returns (bool)`,
          `function redeem(
            uint256 shares,
            address receiver,
            address owner
          ) external returns (uint256 assets)`,
        ],
        signer
      );

      // Check if vault is paused
      const isPaused = await vaultContract.paused();
      if (isPaused) {
        throw new Error('Vault is paused');
      }

      try {
        const tx = await vaultContract.populateTransaction.redeem(
          sharesInWei,
          localAccountAddress,
          localAccountAddress
        );
        return { tx };
      } catch (error) {
        console.error('Redeem failed:', error);
        throw error;
      }
    },
    [selectedVaultId, signer, accountAddress]
  );

  const getDepositWhitelist = useCallback(
    async (depositorAddress = accountAddress): Promise<string> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!provider) {
        throw new Error('Provider not available');
      }
      if (!depositorAddress) {
        throw new Error('No depositor address provided');
      }

      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function getDepositWhitelist(address depositor) external view returns (uint256)`,
        ],
        provider
      );

      try {
        const whitelistAmount = await vaultContract.getDepositWhitelist(depositorAddress);
        return whitelistAmount.toString();
      } catch (error) {
        console.error('Get deposit whitelist failed:', error);
        throw error;
      }
    },
    [selectedVaultId, provider, accountAddress]
  );

  const isDepositWhitelistEnabled = useCallback(
    async (): Promise<boolean> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!provider) {
        throw new Error('Provider not available');
      }

      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function isDepositWhitelistEnabled() external view returns (bool)`,
        ],
        provider
      );

      try {
        const isEnabled = await vaultContract.isDepositWhitelistEnabled();
        return isEnabled;
      } catch (error) {
        console.error('Get deposit whitelist enabled status failed:', error);
        throw error;
      }
    },
    [selectedVaultId, provider]
  );

  const enhanceTransactionWithGas = useCallback(
    async (tx: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionRequest> => {
      if (!signer) {
        throw new Error('No signer available');
      }

      try {
        const [gasLimit, feeData] = await Promise.all([
          signer.estimateGas(tx),
          signer.getFeeData()
        ]);

        const enhancedTx = {
          ...tx,
          gasLimit: gasLimit.mul(115).div(100), // Add 15% buffer
        };

        // Add EIP-1559 fields if available
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          enhancedTx.maxFeePerGas = feeData.maxFeePerGas;
          enhancedTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else if (feeData.gasPrice) {
          enhancedTx.gasPrice = feeData.gasPrice;
        }

        return enhancedTx;
      } catch (gasError) {
        console.warn('Gas estimation failed, proceeding with original transaction:', gasError);
        return tx; // Fallback to original transaction
      }
    },
    [signer]
  );

  const addTransaction = useCallback(
    ({
      action,
      facet,
      inputs,
      vault: inputVault,
    }: Omit<VaultBatchTransaction, 'id'> & { vault: VaultData }) => {
      if (!!selectedVaultId && inputVault.id !== selectedVaultId) {
        setOperationsError(new Error('Vault mismatch'));
        return;
      }
      if (!selectedVaultId) {
        setSelectedVaultId(inputVault.id);
      }
      const newId =
        transactions.length > 0
          ? String(Number(transactions[transactions.length - 1].id) + 1)
          : '0';
      setTransactions([...transactions, { id: newId, action, facet, inputs }]);
    },
    [transactions, selectedVaultId]
  );

  const removeTransaction = useCallback(
    (id: string) => {
      setTransactions(transactions.filter((transaction) => transaction.id !== id));
    },
    [transactions]
  );

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  const getEncodedActions = async (transactionsToEncode: VaultBatchTransaction[]) => {
    const encodedActions = await Promise.all(transactionsToEncode.map((transaction) => {
      const contract = new ethers.Contract(
        selectedVaultId,
        [transaction.action.abi],
        signer
      );

      // Parse the ABI to get the function signature and input types
      const iface = new ethers.utils.Interface([transaction.action.abi]);
      const functionFragment = iface.getFunction(transaction.action.functionName || transaction.action.id);

      // Get the input names from the ABI
      const inputNames = functionFragment.inputs.map((input) => input.name);

      // Map the transaction inputs to the correct order based on the ABI
      const txArgs = inputNames.map((inputName) => {
        // Handle special cases for array inputs (like path in Uniswap)
        if (Array.isArray(transaction.inputs[inputName])) {
          return transaction.inputs[inputName];
        }

        // Handle deadline parameter by adding current timestamp
        if (inputName === 'deadline') {
          const deadlineSeconds = parseInt((transaction.inputs[inputName] as string) || '0');
          const currentTimestamp = Math.floor(Date.now() / 1000);
          return (currentTimestamp + deadlineSeconds).toString();
        }

        return transaction.inputs[inputName] || '0';
      });

      return contract.interface.encodeFunctionData(transaction.action.functionName || transaction.action.id, txArgs);
    }));
    return encodedActions;
  }

  const submitActions = useCallback(
    async (encodedActions: string[]): Promise<ethers.providers.TransactionReceipt> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!signer) {
        throw new Error('No signer available');
      }

      const multicallContract = new ethers.Contract(
        selectedVaultId,
        [`function submitActions(bytes[] calldata actionsData) external returns (uint256 nonce)`],
        signer
      );

      try {
        // Simulate the transaction first
        console.log('Simulating submitActions...');
        await multicallContract.callStatic.submitActions(encodedActions);
        console.log('Simulation successful.');

        // If simulation is successful, proceed with actual transaction
        const tx = await multicallContract.submitActions(encodedActions);
        console.log('Transaction submitted. Hash:', tx.hash);
        const result = await tx.wait();
        return result;
      } catch (error) {
        console.error('Error during submitActions simulation or execution:', error);
        if (error?.data) {
          console.error('Error data:', error.data);
        }
        // Attempt to decode error data if it's a known contract error interface
        try {
          const errorData = error?.error?.data?.data;
          if (errorData && typeof errorData === 'string') {
            const iface = new ethers.utils.Interface(["error Error(string)"]);
            const decodedError = iface.decodeErrorResult("Error", errorData);
            console.error("Decoded revert reason:", decodedError[0]);
          }
        } catch (decodingError) {
          console.warn("Could not decode error data:", decodingError);
        }
        throw error;
      }
    }, [network, signer, transactions, selectedVaultId]);

  const executeActions = useCallback(
    async (nonce: number) => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      const contract = new ethers.Contract(
        selectedVaultId,
        [`function executeActions(uint256 actionsNonce) external`],
        signer
      );
      await contract.executeActions(nonce);
    },
    [signer, selectedVaultId]
  );

  const submitAndExecuteActions = useCallback(async () => {
    setOperationsLoading(true);
    try {
      const encodedActions = await getEncodedActions(transactions);
      console.log('encodedActions', encodedActions);
      const result = await submitActions(encodedActions);
      return result;

      // TODO: uncomment this when we execution sequence needed after submit
      // await executeActions(nonce);
    } catch (error) {
      setOperationsError(error as Error);
    } finally {
      setOperationsLoading(false);
    }
  }, [submitActions, executeActions]);

  const contextValue: VaultContextData = {
    // Network context
    chainId,
    signer,
    network,
    // Info reading
    selectedVaultId,
    setSelectedVaultId,
    getVaultAssetBalance,

    // Operations
    isDrawerOpen,
    setIsDrawerOpen,
    accountAddress,
    transactions,
    nbTransactions,
    depositInVault,
    withdrawFromVault,
    requestWithdraw,
    getWithdrawalRequest,
    getWithdrawalTimelock,
    convertToAssets,
    maxRedeem,
    requestRedeem,
    redeemFromVault,
    getDepositWhitelist,
    isDepositWhitelistEnabled,
    enhanceTransactionWithGas,
    addTransaction,
    removeTransaction,
    clearTransactions,
    getEncodedActions,
    submitActions,
    submitAndExecuteActions,
    operationsLoading,
    operationsError,
  };

  return <VaultContext.Provider value={contextValue}>{children}</VaultContext.Provider>;
};

// Create the hook to use the context
export const useVault = (): VaultContextData => {
  const context = useContext(VaultContext);

  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }

  return context;
};
