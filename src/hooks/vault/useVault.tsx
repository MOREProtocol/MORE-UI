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
    sharePrice?: number;
    shareCurrency?: string;
    roles?: VaultRoles;
  };
  financials?: {
    basics?: {
      grossAssetValue?: MonetaryValue;
      netAssetValue?: MonetaryValue;
    };
    fees?: {
      performance: Fee;
      management: Fee;
      network: Fee;
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

  // Info reading
  selectedVaultId: string | null;
  setSelectedVaultId: (vaultId: string) => void;
  selectedTab: VaultTab;
  setSelectedTab: (tab: VaultTab) => void;
  isLoading: boolean;
  error: string | null;
  getVaultAssetBalance: (assetAddress: string) => Promise<string>;

  // Operations
  isDrawerOpen: boolean;
  setIsDrawerOpen: (value: boolean) => void;
  accountAddress: string | null;
  transactions: VaultBatchTransaction[];
  nbTransactions: number;
  depositInVault: (amountInWei: string) => Promise<string>;
  withdrawFromVault: (amountInWei: string) => Promise<string>;
  checkApprovalNeeded: (amountInWei: string) => Promise<boolean>;
  addTransaction: ({
    action,
    facet,
    inputs,
    vault,
  }: Omit<VaultBatchTransaction, 'id'> & { vault: VaultData }) => void;
  removeTransaction: (id: string) => void;
  submitAndExecuteActions: () => void;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
  const chainId = useMemo(() => walletClient?.chain.id ?? ChainIds.flowEVMMainnet, [walletClient]);
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
    async (amountInWei: string): Promise<string> => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!accountAddress) {
        throw new Error('No account connected');
      }
      if (!signer) {
        throw new Error('No signer available');
      }

      console.log('Depositing', amountInWei);
      console.log('amountInWei', amountInWei);
      console.log('accountAddress', accountAddress);

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
      const allowance = await tokenContract.allowance(accountAddress, selectedVaultId);
      if (allowance.lt(amountInWei)) {
        console.log('Approving token spend...');
        const approveTx = await tokenContract.approve(selectedVaultId, ethers.constants.MaxUint256);
        await approveTx.wait();
        console.log('Approval successful');
      }

      try {
        const tx = await vaultContract.deposit(amountInWei, accountAddress);
        const receipt = await tx.wait();
        console.log('Deposit successful:', receipt.transactionHash);
        return receipt.transactionHash;
      } catch (error) {
        console.error('Deposit failed:', error);
        throw error;
      }
    },
    [selectedVaultId, signer, accountAddress]
  );

  const withdrawFromVault = useCallback(
    async (amountInWei: string): Promise<string> => {
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
        const tx = await vaultContract.withdraw(amountInWei, accountAddress, accountAddress);
        const receipt = await tx.wait();
        console.log('Withdrawal successful:', receipt.transactionHash);
        return receipt.transactionHash;
      } catch (error) {
        console.error('Withdrawal failed:', error);
        throw error;
      }
    },
    [selectedVaultId, signer, accountAddress]
  );
  const checkApprovalNeeded = useCallback(
    async (amountInWei: string) => {
      if (!selectedVaultId) {
        throw new Error('No vault selected');
      }
      if (!accountAddress) {
        throw new Error('No account connected');
      }
      if (!signer) {
        throw new Error('No signer available');
      }

      // Get the vault contract to get the asset address
      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [`function asset() external view returns (address)`],
        signer
      );

      // Get the token contract for approval check
      const assetAddress = await vaultContract.asset();
      const tokenContract = new ethers.Contract(
        assetAddress,
        [`function allowance(address owner, address spender) external view returns (uint256)`],
        signer
      );

      // Check current allowance
      const allowance = await tokenContract.allowance(accountAddress, selectedVaultId);
      return allowance.lt(amountInWei);
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

  const submitActions = useCallback(async () => {
    if (!selectedVaultId) {
      throw new Error('No vault selected');
    }
    const encodedActions = transactions.map((transaction) => {
      const contract = new ethers.Contract(
        transaction.facet.contractAddress[network],
        [transaction.action.abi],
        signer
      );
      const txArgs = transaction.action.inputs.map((input) => transaction.inputs[input.id] || '0');
      return contract.interface.encodeFunctionData(transaction.action.id, txArgs);
    });

    const multicallContract = new ethers.Contract(
      selectedVaultId,
      [`function submitActions(bytes[] calldata actionsData) external returns (uint256 nonce)`],
      signer
    );
    const nonce = await multicallContract.submitActions(encodedActions);
    return nonce;
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
      const nonce = await submitActions();
      console.log('nonce', nonce);
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

    // Info reading
    selectedVaultId,
    setSelectedVaultId,
    selectedTab,
    setSelectedTab: handleTabChange,
    isLoading,
    error,
    getVaultAssetBalance,

    // Operations
    isDrawerOpen,
    setIsDrawerOpen,
    accountAddress,
    transactions,
    nbTransactions,
    depositInVault,
    withdrawFromVault,
    checkApprovalNeeded,
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
