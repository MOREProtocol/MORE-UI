import React from 'react';
import { useVaultInfo } from 'src/hooks/useVaultInfo';

export const VaultActivity: React.FC = () => {
  const { vault, isLoading, error } = useVaultInfo();

  if (isLoading) return <div>Loading activity data...</div>;
  if (error) return <div>Error loading activity: {error}</div>;
  if (!vault) return <div>No vault data available</div>;

  return (
    <div>
      <h2>Vault Activity</h2>
      <p>Recent transactions and activity history will be displayed here.</p>
      {/* Add transaction history, activity log, and event timeline here */}
    </div>
  );
};
