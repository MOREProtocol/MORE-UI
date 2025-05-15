import { useState, useEffect, useCallback, useRef } from 'react';

import { usePolling } from './usePolling';

export interface AddressAllowedResult {
  isAllowed: boolean;
  isLoading: boolean;
  error?: string;
}

const TWO_MINUTES = 2 * 60 * 1000;

export const useAddressAllowed = (address: string): AddressAllowedResult => {
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const isFetchingRef = useRef(false);

  const getIsAddressAllowed = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }

    if (!address) {
      setIsAllowed(true);
      setIsLoading(false);
      setError('Address is not provided.');
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/check-sanction?address=${address}`);

      if (response.ok) {
        const data: { isSanctioned: boolean; error?: string } = await response.json();
        if (data.error) {
          setIsAllowed(true);
          setError(data.error);
        } else {
          setIsAllowed(!data.isSanctioned);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch from /api/check-sanction:', response.status, errorText);
        setIsAllowed(true);
        setError(`Failed to check address status (${response.status})`);
      }
    } catch (e) {
      console.error('Error in getIsAddressAllowed:', e);
      setIsAllowed(true);
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      getIsAddressAllowed();
    } else {
      setIsAllowed(true);
      setIsLoading(false);
      setError(undefined);
      if (isFetchingRef.current) {
        isFetchingRef.current = false;
      }
    }
  }, [address, getIsAddressAllowed]);

  usePolling(getIsAddressAllowed, TWO_MINUTES, false, [address]);

  return {
    isAllowed,
    isLoading,
    error,
  };
};
