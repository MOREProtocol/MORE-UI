import { ProtocolAction } from '@aave/contract-helpers';
import { BoxProps } from '@mui/material';
import { useTransactionHandler } from 'src/helpers/useTransactionHandler';
import { ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useRootStore } from 'src/store/root';

import { TxActionsWrapper } from '../TxActionsWrapper';

export interface WithdrawActionsProps extends BoxProps {
  poolReserve: ComputedReserveDataWithMarket;
  amountToWithdraw: string;
  poolAddress: string;
  isWrongNetwork: boolean;
  symbol: string;
  blocked: boolean;
}

export const WithdrawActions = ({
  poolReserve,
  amountToWithdraw,
  poolAddress,
  isWrongNetwork,
  symbol,
  blocked,
  sx,
}: WithdrawActionsProps) => {
  const currentMarketData = useRootStore((state) => state.currentMarketData);
  const [withdraw, addWithdrawAction] = useRootStore((state) => [
    state.withdraw,
    state.addWithdrawAction,
  ]);
  const { action, loadingTxns, mainTxState, approvalTxState, approval, requiresApproval } =
    useTransactionHandler({
      tryPermit: false,
      handleGetTxns: async () =>
        withdraw({
          reserve: poolAddress,
          amount: amountToWithdraw,
          aTokenAddress: poolReserve.aTokenAddress,
        }),
      skip: !amountToWithdraw || parseFloat(amountToWithdraw) === 0 || blocked,
      deps: [amountToWithdraw, poolAddress],
      eventTxInfo: {
        amount: amountToWithdraw,
        assetName: poolReserve.name,
        asset: poolReserve.underlyingAsset,
      },
      protocolAction: ProtocolAction.withdraw,
    });
  const handleAddToBatch = async () => {
    await addWithdrawAction({
      action: 'withdraw',
      market: currentMarketData.market,
      poolAddress: poolAddress,
      aTokenAddress: poolReserve.aTokenAddress,
      amount: amountToWithdraw,
      decimals: poolReserve.decimals,
      symbol,
    });
  };

  return (
    <TxActionsWrapper
      blocked={blocked}
      preparingTransactions={loadingTxns}
      approvalTxState={approvalTxState}
      mainTxState={mainTxState}
      amount={amountToWithdraw}
      isWrongNetwork={isWrongNetwork}
      requiresAmount
      actionInProgressText={`Withdrawing ${symbol}`}
      actionText={`Withdraw ${symbol}`}
      handleAction={action}
      handleAddToBatch={handleAddToBatch}
      handleApproval={() => approval([{ amount: amountToWithdraw, underlyingAsset: poolAddress }])}
      symbol={symbol}
      requiresApproval={requiresApproval}
      sx={sx}
    />
  );
};
