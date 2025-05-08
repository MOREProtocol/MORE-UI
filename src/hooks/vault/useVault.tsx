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
import { useWalletClient } from 'wagmi';

import { CustomMarket } from '../../ui-config/marketsConfig';
import { useVaultProvider } from './useVaultData';
import { useRootStore } from 'src/store/root';

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
  curator: string;
  guardian: string;
}

// Define return metrics
export interface ReturnMetrics {
  monthToDate: number;
  quarterToDate: number;
  yearToDate: number;
  inceptionToDate: number;
  averageMonth: number;
  bestMonth: number;
  worstMonth: number;
  trackRecord: number; // Number of months
}

// Define the complete vault data structure
export interface VaultData {
  id: string;
  overview: {
    name?: string;
    description?: string;
    assetAddress?: string;
    assetDecimals?: number;
    sharePrice?: number;
    shareCurrencySymbol?: string;
    roles?: VaultRoles;
    apy?: number;
    historicalSnapshots?: {
      apy: { time: string; value: number }[];
      totalSupply: { time: string; value: number }[];
    };
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
    };
    returnMetrics?: ReturnMetrics;
  };
  allocation?: {
    assetName: string;
    assetSymbol: string;
    assetAddress: string;
    type: string;
    market: string;
    balance: number;
    price?: number;
    priceChangeLast24Hours?: number;
    value?: number;
  }[];
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

  // Info reading
  selectedVaultId: string | null;
  setSelectedVaultId: (vaultId: string) => void;
  selectedTab: VaultTab;
  setSelectedTab: (tab: VaultTab) => void;
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
  addTransaction: ({
    action,
    facet,
    inputs,
    vault,
  }: Omit<VaultBatchTransaction, 'id'> & { vault: VaultData }) => void;
  removeTransaction: (id: string) => void;
  submitAndExecuteActions: () => Promise<ethers.providers.TransactionReceipt>;
  operationsLoading: boolean;
  operationsError: Error | null;
}

// Create the context
const VaultContext = createContext<VaultContextData | undefined>(undefined);

// Create the provider component
export const VaultProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const router = useRouter();
  const { selectedTab: tabFromUrl, vaultId: selectedVaultIdFromUrl } = router.query;

  // Info reading state
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<VaultTab>((tabFromUrl as VaultTab) || 'overview');

  // Operations state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<VaultBatchTransaction[]>([]);
  const [operationsError, setOperationsError] = useState<Error | null>(null);
  const [operationsLoading, setOperationsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (selectedVaultIdFromUrl) {
      setSelectedVaultId(selectedVaultIdFromUrl as string);
    }
  }, [selectedVaultIdFromUrl]);

  // Web3 setup
  const { data: walletClient } = useWalletClient();
  const chainId = useMemo(() => walletClient?.chain?.id || ChainIds.flowEVMMainnet, [walletClient]);
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
      console.error('Invalid network', chainId);
      // Default to mainnet if network can't be determined
      return 'mainnet';
    }
  }, [chainId]);
  const accountAddress = useMemo(() => walletClient?.account.address, [walletClient]);

  const { currentMarket, setCurrentMarket } = useRootStore();
  useEffect(() => {
    if (network === 'mainnet' && currentMarket !== CustomMarket.proto_flow_v3) {
      setCurrentMarket(CustomMarket.proto_flow_v3);
    } else if (network === 'testnet' && currentMarket !== CustomMarket.proto_testnet_v3) {
      setCurrentMarket(CustomMarket.proto_testnet_v3);
    }
  }, [network, setCurrentMarket]);

  // Update URL when tab changes
  const handleTabChange = (tab: VaultTab) => {
    setSelectedTab(tab);
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, selectedTab: tab },
      },
      undefined,
      { shallow: true }
    );
  };

  // Sync with URL parameters
  useEffect(() => {
    if (tabFromUrl && typeof tabFromUrl === 'string') {
      setSelectedTab(tabFromUrl as VaultTab);
    }
  }, [tabFromUrl]);

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

  const submitActions = useCallback(async (): Promise<ethers.providers.TransactionReceipt> => {
    if (!selectedVaultId) {
      throw new Error('No vault selected');
    }
    const encodedActions = transactions.map((transaction) => {
      const contract = new ethers.Contract(
        transaction.facet.contractAddress[network],
        [transaction.action.abi],
        signer
      );

      // Parse the ABI to get the function signature and input types
      const iface = new ethers.utils.Interface([transaction.action.abi]);
      const functionFragment = iface.getFunction(transaction.action.id);

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

      return contract.interface.encodeFunctionData(transaction.action.id, txArgs);
    });

    const multicallContract = new ethers.Contract(
      selectedVaultId,
      [`function submitActions(bytes[] calldata actionsData) external returns (uint256 nonce)`],
      signer
    );
    const tx = await multicallContract.submitActions(encodedActions);
    const result = await tx.wait();
    return result;
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
      const result = await submitActions();
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

    // Info reading
    selectedVaultId,
    setSelectedVaultId,
    selectedTab,
    setSelectedTab: handleTabChange,
    getVaultAssetBalance,

    // Operations
    isDrawerOpen,
    setIsDrawerOpen,
    accountAddress,
    transactions,
    nbTransactions,
    depositInVault,
    withdrawFromVault,
    addTransaction,
    removeTransaction,
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
