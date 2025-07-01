import { useEffect, useState } from 'react';
import { useVault } from './useVault';
import { ethers } from 'ethers';

export interface DepositWhitelistData {
  whitelistAmount: string;
  isWhitelisted: boolean;
  isWhitelistEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useDepositWhitelist = (depositorAddress?: string): DepositWhitelistData => {
  const { getDepositWhitelist, isDepositWhitelistEnabled, accountAddress, selectedVaultId } = useVault();
  const [whitelistAmount, setWhitelistAmount] = useState<string>('0');
  const [isWhitelistEnabled, setIsWhitelistEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addressToCheck = depositorAddress || accountAddress;

  useEffect(() => {
    const fetchWhitelistData = async () => {
      if (!selectedVaultId || !isDepositWhitelistEnabled) {
        setWhitelistAmount('0');
        setIsWhitelistEnabled(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First check if whitelisting is enabled
        const whitelistEnabled = await isDepositWhitelistEnabled();
        setIsWhitelistEnabled(whitelistEnabled);

        // Only fetch whitelist amount if whitelisting is enabled and we have an address
        if (whitelistEnabled && addressToCheck && getDepositWhitelist) {
          const amount = await getDepositWhitelist(addressToCheck);
          setWhitelistAmount(amount);
        } else {
          setWhitelistAmount('0');
        }
      } catch (err) {
        console.error('Error fetching deposit whitelist data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch whitelist data');
        setWhitelistAmount('0');
        setIsWhitelistEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWhitelistData();
  }, [addressToCheck, selectedVaultId, getDepositWhitelist, isDepositWhitelistEnabled]);

  // Only consider whitelisted if whitelisting is enabled and amount is greater than 0
  const isWhitelisted = isWhitelistEnabled && whitelistAmount !== '0' && ethers.BigNumber.from(whitelistAmount).gt(0);

  return {
    whitelistAmount,
    isWhitelisted,
    isWhitelistEnabled,
    isLoading,
    error,
  };
}; 