import { useEffect, useState } from 'react';
import { useVault } from './useVault';
import { ethers } from 'ethers';

export interface DepositWhitelistData {
  whitelistAmount: string;
  isWhitelisted: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useDepositWhitelist = (depositorAddress?: string): DepositWhitelistData => {
  const { getDepositWhitelist, accountAddress, selectedVaultId } = useVault();
  const [whitelistAmount, setWhitelistAmount] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addressToCheck = depositorAddress || accountAddress;

  useEffect(() => {
    const fetchWhitelistAmount = async () => {
      if (!addressToCheck || !selectedVaultId || !getDepositWhitelist) {
        setWhitelistAmount('0');
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const amount = await getDepositWhitelist(addressToCheck);
        setWhitelistAmount(amount);
      } catch (err) {
        console.error('Error fetching deposit whitelist:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch whitelist data');
        setWhitelistAmount('0');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWhitelistAmount();
  }, [addressToCheck, selectedVaultId, getDepositWhitelist]);

  const isWhitelisted = whitelistAmount !== '0' && ethers.BigNumber.from(whitelistAmount).gt(0);

  return {
    whitelistAmount,
    isWhitelisted,
    isLoading,
    error,
  };
}; 