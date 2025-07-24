import { useTransactionHandler } from 'src/helpers/useTransactionHandler';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useRootStore } from 'src/store/root';

import { TxActionsWrapper } from '../TxActionsWrapper';

export type FaucetActionsProps = {
  poolReserve: ComputedReserveData;
  isWrongNetwork: boolean;
  blocked: boolean;
};

export const FaucetActions = ({ poolReserve, isWrongNetwork, blocked }: FaucetActionsProps) => {
  const mint = useRootStore((state) => state.mint);

  const { action, loadingTxns, mainTxState, requiresApproval } = useTransactionHandler({
    tryPermit: false,
    handleGetTxns: async () => {
      return mint({
        tokenSymbol: poolReserve.symbol,
        reserve: poolReserve.underlyingAsset,
      });
    },
    skip: blocked,
  });

  return (
    <TxActionsWrapper
      requiresApproval={requiresApproval}
      blocked={blocked}
      preparingTransactions={loadingTxns}
      handleAction={action}
      actionText={`Faucet ${poolReserve.symbol}`}
      actionInProgressText={'Pending...'}
      mainTxState={mainTxState}
      isWrongNetwork={isWrongNetwork}
      symbol={poolReserve.symbol}
    />
  );
};
