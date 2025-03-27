import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Action, Facet } from 'src/modules/vault-detail/VaultManagement/facets/types';

interface VaultBatchTransaction {
  id: string;
  action: Action;
  facet: Facet;
  inputs: Record<string, string>;
}

interface UseVaultBundleReturn {
  transactions: VaultBatchTransaction[];
  nbTransactions: number;
  addTransaction: ({ action, facet, inputs }: Omit<VaultBatchTransaction, 'id'>) => void;
  removeTransaction: (id: string) => void;
  // isLoading: boolean;
  // error: Error | null;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (value: boolean) => void;
}

const VaultBundleContext = createContext<UseVaultBundleReturn | undefined>(undefined);

export const VaultBundleProvider = ({ children }: { children: ReactNode }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<VaultBatchTransaction[]>([]);
  // const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [error, setError] = useState<Error | null>(null);

  const nbTransactions = useMemo(() => {
    return transactions.length;
  }, [transactions]);

  const addTransaction = useCallback(
    ({ action, facet, inputs }: Omit<VaultBatchTransaction, 'id'>) => {
      const newId =
        transactions.length > 0
          ? String(Number(transactions[transactions.length - 1].id) + 1)
          : '0';
      setTransactions([...transactions, { id: newId, action, facet, inputs }]);
    },
    [transactions]
  );

  const removeTransaction = useCallback(
    (id: string) => {
      setTransactions(transactions.filter((transaction) => transaction.id !== id));
    },
    [transactions]
  );

  const value = {
    transactions,
    nbTransactions,
    addTransaction,
    removeTransaction,
    // isLoading,
    // error,
    isDrawerOpen,
    setIsDrawerOpen,
  };

  return <VaultBundleContext.Provider value={value}>{children}</VaultBundleContext.Provider>;
};

export const useVaultBundle = (): UseVaultBundleReturn => {
  const context = useContext(VaultBundleContext);
  if (context === undefined) {
    throw new Error('useVaultBundle must be used within a VaultBundleProvider');
  }
  return context;
};
