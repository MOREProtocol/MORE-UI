import React from 'react';
import { useVaultInfo } from 'src/hooks/useVaultInfo';

export const VaultAllocations: React.FC = () => {
  const { vault, isLoading, error } = useVaultInfo();

  if (isLoading) return <div>Loading allocations data...</div>;
  if (error) return <div>Error loading allocations: {error}</div>;
  if (!vault) return <div>No vault data available</div>;

  return (
    <div>
      <h2>Vault Allocations</h2>
      <p>Asset allocation information will be displayed here.</p>
      {/* Add allocation charts, tables, and distribution data here */}
    </div>
  );
};
