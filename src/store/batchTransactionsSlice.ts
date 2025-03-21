import { InterestRate } from '@aave/contract-helpers';
import { ethers, PopulatedTransaction } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { TOKEN_LIST } from 'src/ui-config/TokenList';
import { CustomMarket, marketsData } from 'src/utils/marketsAndNetworksConfig';
import { StateCreator } from 'zustand';

import multicallAbi from '../libs/abis/multicall_abi.json';
import { RootStore } from './root';

const MULTICALL_ADDRESS = '0xF7d11c74B5706155d7C6DBe931d590611a371a8a';

export interface BatchTransaction {
  action: 'supply' | 'borrow' | 'repay' | 'withdraw' | 'transfer' | 'approve' | 'delegate';
  market: CustomMarket;
  poolAddress: string;
  amount: string;
  symbol: string;
  decimals: number;
  isHidden?: boolean;
  debtTokenAddress?: string;
  debtType?: InterestRate;
  aTokenAddress?: string;
  status?: 'pending' | 'approved' | 'failed';
  tx?: PopulatedTransaction;
}

export interface BatchTransactionsSlice {
  batchTransactionGroups: BatchTransaction[][];
  addToBatch: (transaction: BatchTransaction[]) => void;
  removeBatchItem: (groupIndex: number) => void;
  clearBatch: () => void;
  signer: ethers.providers.JsonRpcSigner | undefined;
  setSigner: (signer: ethers.providers.JsonRpcSigner) => void;
  checkAndGetTokenApproval: (
    market: CustomMarket,
    assetAddress: string,
    assetSymbol: string,
    spender: string,
    amountInWei: ethers.BigNumber,
    approvalType: 'standard' | 'delegation'
  ) => Promise<BatchTransaction | undefined>;
  addSupplyAction: (transaction: BatchTransaction) => Promise<void>;
  addWithdrawAction: (transaction: BatchTransaction) => Promise<void>;
  addBorrowAction: (transaction: BatchTransaction) => Promise<void>;
  addRepayAction: (transaction: BatchTransaction) => Promise<void>;
  getTransferFromSignerToMulticall: (
    tokenAddress: string,
    tokenSymbol: string,
    amountInWei: ethers.BigNumber
  ) => Promise<PopulatedTransaction>;
  getTokenInfoAndAmount: (
    market: CustomMarket,
    underlyingAsset: string,
    amount: string
  ) => {
    assetAddress: string;
    poolAddress: string;
    amountInWei: ethers.BigNumber;
    isNativeToken: boolean;
    wethGatewayAddress: string;
    decimals: number;
  };
  getGasLimit: () => string;
  getBatchTx: () => Promise<PopulatedTransaction>;
}

export const createBatchTransactionsSlice: StateCreator<
  RootStore,
  [['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  BatchTransactionsSlice
> = (set, get) => ({
  batchTransactionGroups: [],
  addToBatch: (transaction) =>
    set((state) => ({
      batchTransactionGroups: [...state.batchTransactionGroups, transaction],
    })),
  removeBatchItem: (groupIndex) =>
    set((state) => ({
      batchTransactionGroups: state.batchTransactionGroups.filter((_, i) => i !== groupIndex),
    })),
  clearBatch: () => set({ batchTransactionGroups: [] }),
  signer: undefined,
  setSigner: (signer: ethers.providers.JsonRpcSigner) => {
    if (signer) {
      set({ signer });
    }
  },
  checkAndGetTokenApproval: async (
    market: CustomMarket,
    assetAddress: string,
    assetSymbol: string,
    spender: string,
    amountInWei: ethers.BigNumber,
    approvalType: 'standard' | 'delegation' = 'standard'
  ): Promise<BatchTransaction | undefined> => {
    console.log(
      'Checking and adding token approval for:',
      assetAddress,
      assetSymbol,
      spender,
      amountInWei,
      approvalType
    );
    try {
      // Skip for native token (ETH)
      if (
        assetAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'.toLowerCase()
      ) {
        console.log('Native token (ETH) detected, no approval needed');
        return;
      }

      const signerAddress = await get().signer?.getAddress();

      // Different interfaces for standard approvals vs delegation approvals
      const standardErc20Interface = new ethers.utils.Interface([
        'function allowance(address owner, address spender) external view returns (uint256)',
        'function approve(address spender, uint256 amount) external returns (bool)',
      ]);

      const delegationErc20Interface = new ethers.utils.Interface([
        'function borrowAllowance(address fromUser, address toUser) external view returns (uint256)',
        'function approveDelegation(address delegatee, uint256 amount) external',
      ]);

      const tokenContract = new ethers.Contract(
        assetAddress,
        approvalType === 'standard' ? standardErc20Interface : delegationErc20Interface,
        get().signer
      );

      // Check current allowance based on approval type
      let currentAllowance;
      if (approvalType === 'standard') {
        currentAllowance = await tokenContract.allowance(signerAddress, spender);
        console.log(
          `Current standard allowance for ${assetSymbol} (${assetAddress}): ${currentAllowance.toString()}`
        );
      } else {
        currentAllowance = await tokenContract.borrowAllowance(signerAddress, spender);
        console.log(
          `Current delegation allowance for ${assetSymbol} (${assetAddress}): ${currentAllowance.toString()}`
        );
      }

      // Check if approval is needed
      if (currentAllowance.lt(amountInWei)) {
        console.log(`Adding ${approvalType} approval for ${assetSymbol}`);

        // Check if we already have an approval/delegation for this asset in the current group
        const currentGroup = get().batchTransactionGroups[get().batchTransactionGroups.length - 1];
        const existingApproval = currentGroup?.find(
          (tx) =>
            tx.tx?.to?.toLowerCase() === assetAddress.toLowerCase() &&
            tx.action === (approvalType === 'standard' ? 'approve' : 'delegate')
        );

        if (!existingApproval) {
          let approvalTx;
          if (approvalType === 'standard') {
            // Generate standard approval transaction
            approvalTx = await tokenContract.populateTransaction.approve(
              spender,
              ethers.constants.MaxUint256 // Approve max amount
            );
          } else {
            // Generate delegation approval transaction
            approvalTx = await tokenContract.populateTransaction.approveDelegation(
              spender,
              ethers.constants.MaxUint256 // Approve max amount
            );
          }
          const approvalTransaction: BatchTransaction = {
            action: approvalType === 'standard' ? 'approve' : 'delegate',
            market: market,
            poolAddress: '',
            amount: '',
            symbol: assetSymbol,
            decimals: 0,
            isHidden: true,
            tx: {
              to: assetAddress,
              value: ethers.BigNumber.from(0),
              data: approvalTx.data || '',
              gasLimit: ethers.BigNumber.from(200000),
            },
          };

          return approvalTransaction;

          // return true;
        } else {
          console.log(`Approval/delegation already exists for ${assetSymbol}`);
          // return false;
        }
      }

      console.log(`Sufficient ${approvalType} allowance already exists for ${assetSymbol}`);
      return;
    } catch (error) {
      console.error(`Error checking/adding ${approvalType} approval:`, error);
      return;
    }
  },
  getTokenInfoAndAmount: (
    market: CustomMarket,
    underlyingAsset: string,
    amount: string
  ): {
    assetAddress: string;
    poolAddress: string;
    amountInWei: ethers.BigNumber;
    isNativeToken: boolean;
    wethGatewayAddress: string;
    decimals: number;
  } => {
    // Get market and asset information
    const marketConfig = marketsData[market];
    const poolAddress = marketConfig.addresses.LENDING_POOL;
    
    // Convert amount to token units
    const tokenInfo = TOKEN_LIST.tokens.find(
      (token) => token.chainId === marketConfig.chainId && token.address.toLowerCase() === underlyingAsset.toLowerCase()
    );

    if (!tokenInfo) {
      throw new Error(`Token info not found for ${underlyingAsset}`);
    }
    const assetAddress = tokenInfo.address;

    // Check if native token
    const isNativeToken =
      assetAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'.toLowerCase();


    // Determine amount in wei
    let amountInWei;
    if (amount.toUpperCase() === 'MAX') {
      amountInWei = ethers.constants.MaxUint256;
    } else {
      amountInWei = ethers.utils.parseUnits(amount, tokenInfo.decimals);
    }

    return {
      assetAddress,
      poolAddress,
      amountInWei,
      decimals: tokenInfo.decimals,
      isNativeToken,
      wethGatewayAddress: marketConfig.addresses.WETH_GATEWAY,
    };
  },
  getTransferFromSignerToMulticall: async (
    tokenAddress: string,
    tokenSymbol: string,
    amountInWei: ethers.BigNumber
  ): Promise<PopulatedTransaction> => {
    try {
      console.log(`Adding transferFrom action for ${tokenSymbol}`);

      const signerAddress = await get().signer?.getAddress();

      // Create ERC20 interface for transferFrom
      const erc20Interface = new ethers.utils.Interface([
        'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
      ]);

      // Encode the transferFrom function call
      // This will transfer tokens from the user to the multicall contract
      console.log('signerAddress', signerAddress);
      const transferFromCalldata = erc20Interface.encodeFunctionData('transferFrom', [
        signerAddress,
        MULTICALL_ADDRESS,
        amountInWei,
      ]);

      // Add the transferFrom action
      return {
        to: tokenAddress,
        value: ethers.BigNumber.from(0),
        data: transferFromCalldata,
        gasLimit: ethers.BigNumber.from(200000),
      };
    } catch (error) {
      console.error(`Error adding transferFrom action for ${tokenSymbol}:`, error);
      throw new Error(
        `Failed to add transferFrom action: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
  addSupplyAction: async (transaction: BatchTransaction) => {
    const supplyTransactions: BatchTransaction[] = [];
    const { assetAddress, isNativeToken, amountInWei } = get().getTokenInfoAndAmount(
      transaction.market,
      transaction.poolAddress,
      transaction.amount
    );
    const supplyTx = get().supply({
      amount: parseUnits(transaction.amount, transaction.decimals).toString(),
      reserve: assetAddress,
      onBehalfOf: get().account,
    });

    // For non-native tokens, we need to transfer them from the user to the multicall contract
    if (!isNativeToken) {
      const transferActionTx = await get().getTransferFromSignerToMulticall(
        assetAddress,
        transaction.symbol,
        amountInWei
      );
      supplyTransactions.push({
        ...transaction,
        isHidden: true,
        action: 'transfer',
        tx: transferActionTx,
      });
    }

    // Check and add approval if needed for non-native tokens
    if (!isNativeToken) {
      const approvalTransaction = await get().checkAndGetTokenApproval(
        transaction.market,
        assetAddress,
        transaction.symbol,
        MULTICALL_ADDRESS,
        amountInWei,
        'standard'
      );
      approvalTransaction && supplyTransactions.push(approvalTransaction);
    }

    // TODO: Unwrap WETH if needed to be able to supply

    supplyTransactions.push({
      ...transaction,
      isHidden: false,
      tx: supplyTx,
    });

    get().addToBatch(supplyTransactions);
  },
  addWithdrawAction: async (transaction: BatchTransaction) => {
    const withdrawTransactions: BatchTransaction[] = [];

    const { assetAddress, isNativeToken, amountInWei, wethGatewayAddress, decimals } =
      get().getTokenInfoAndAmount(transaction.market, transaction.poolAddress, transaction.amount);
    const aTokenAddress = transaction.aTokenAddress;

    if (!aTokenAddress) {
      throw new Error(`No aToken address found for ${transaction.symbol}`);
    }

    const approvalTransaction = await get().checkAndGetTokenApproval(
      transaction.market,
      aTokenAddress,
      `${transaction.symbol} aToken`,
      MULTICALL_ADDRESS,
      amountInWei,
      'standard'
    );
    approvalTransaction && withdrawTransactions.push(approvalTransaction);

    // Transfer aTokens from user to multicall contract
    const transferActionTx = await get().getTransferFromSignerToMulticall(
      aTokenAddress,
      `${transaction.symbol} aToken`,
      amountInWei
    );
    transferActionTx &&
      withdrawTransactions.push({
        ...transaction,
        isHidden: true,
        action: 'transfer',
        tx: transferActionTx,
      });

    // TODO: Withdraw and wrap WETH if needed to be able to withdraw
    if (isNativeToken) {
      // WETH Gateway ABI for withdrawETH
      const wethGatewayAbi = [
        'function withdrawETH(address lendingPool, uint256 amount, address to) external',
      ];

      const wethGatewayContract = new ethers.Contract(
        wethGatewayAddress,
        wethGatewayAbi,
        get().signer
      );

      // Generate transaction data for withdrawing ETH
      const withdrawEthTx = await wethGatewayContract.populateTransaction.withdrawETH(
        transaction.poolAddress, // LENDING POOL?????
        amountInWei.toString(),
        get().account
      );
      withdrawTransactions.push({
        ...transaction,
        isHidden: false,
        action: 'withdraw',
        tx: withdrawEthTx,
      });
    } else {
      // Check aToken balance
      const aTokenAbi = ['function balanceOf(address account) external view returns (uint256)'];
      const aTokenContract = new ethers.Contract(aTokenAddress, aTokenAbi, get().signer);

      try {
        const aTokenBalance = await aTokenContract.balanceOf(get().account);
        console.log('aToken balance:', ethers.utils.formatUnits(aTokenBalance, decimals));

        // If balance is zero, return an error
        if (aTokenBalance.isZero()) {
          throw new Error(`No ${transaction.symbol} aToken balance to withdraw`);
        }
      } catch (balanceError) {
        console.error('Error checking aToken balance:', balanceError);
      }

      // Transfer aTokens from user to multicall contract
      const transferActionTx = await get().getTransferFromSignerToMulticall(
        aTokenAddress,
        `${transaction.symbol} aToken`,
        amountInWei
      );
      transferActionTx &&
        withdrawTransactions.push({
          ...transaction,
          isHidden: true,
          action: 'transfer',
          tx: transferActionTx,
        });

      const approvalTransaction = await get().checkAndGetTokenApproval(
        transaction.market,
        aTokenAddress,
        `${transaction.symbol} aToken`,
        MULTICALL_ADDRESS,
        amountInWei,
        'standard'
      );
      approvalTransaction && withdrawTransactions.push(approvalTransaction);
      const poolAbi = [
        'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
      ];
      const poolContract = new ethers.Contract(transaction.poolAddress, poolAbi, get().signer);
      const withdrawTx = await poolContract.populateTransaction.withdraw(
        assetAddress,
        amountInWei.toString(),
        get().account
      );

      withdrawTransactions.push({
        ...transaction,
        isHidden: false,
        action: 'withdraw',
        tx: { ...withdrawTx, gasLimit: ethers.BigNumber.from(200000) },
      });

      get().addToBatch(withdrawTransactions);
    }
  },
  addBorrowAction: async (transaction: BatchTransaction) => {
    const borrowTransactions: BatchTransaction[] = [];

    const { assetAddress, isNativeToken, amountInWei } = get().getTokenInfoAndAmount(
      transaction.market,
      transaction.poolAddress,
      transaction.amount
    );

    if (!isNativeToken && transaction.debtTokenAddress) {
      const approvalTransaction = await get().checkAndGetTokenApproval(
        transaction.market,
        transaction.debtTokenAddress,
        transaction.symbol,
        MULTICALL_ADDRESS,
        amountInWei,
        'delegation'
      );
      approvalTransaction && borrowTransactions.push(approvalTransaction);
    }

    const borrowTx = get().borrow({
      amount: parseUnits(transaction.amount, transaction.decimals).toString(),
      reserve: assetAddress,
      interestRateMode: InterestRate.Variable,
      debtTokenAddress: transaction.debtTokenAddress,
      onBehalfOf: get().account,
    });

    borrowTransactions.push({
      ...transaction,
      isHidden: false,
      action: 'borrow',
      tx: borrowTx,
    });

    if (!isNativeToken) {
      // Create ERC20 interface for transfer
      const erc20Interface = new ethers.utils.Interface([
        'function transfer(address to, uint256 amount) external returns (bool)',
      ]);

      // Encode the transfer function call
      const transferActionData = erc20Interface.encodeFunctionData('transfer', [
        get().account,
        amountInWei,
      ]);
      borrowTransactions.push({
        ...transaction,
        isHidden: true,
        action: 'transfer',
        tx: {
          data: transferActionData,
          to: assetAddress,
          value: ethers.BigNumber.from(0),
          gasLimit: ethers.BigNumber.from(200000),
        },
      });
    }

    get().addToBatch(borrowTransactions);
  },
  addRepayAction: async (transaction: BatchTransaction) => {
    const repayTransactions: BatchTransaction[] = [];

    const { assetAddress, isNativeToken, amountInWei } = get().getTokenInfoAndAmount(
      transaction.market,
      transaction.poolAddress,
      transaction.amount
    );

    // For non-native tokens, we need to transfer them from the user to the multicall contract
    if (!isNativeToken) {
      const transferActionTx = await get().getTransferFromSignerToMulticall(
        assetAddress,
        transaction.symbol,
        amountInWei
      );
      repayTransactions.push({
        ...transaction,
        isHidden: true,
        action: 'transfer',
        tx: transferActionTx,
      });

      const approvalTransaction = await get().checkAndGetTokenApproval(
        transaction.market,
        assetAddress,
        transaction.symbol,
        MULTICALL_ADDRESS,
        amountInWei,
        'standard'
      );
      approvalTransaction && repayTransactions.push(approvalTransaction);
    }

    // TODO: repay with aTokens ??
    const repayTx = get().repay({
      amountToRepay: parseUnits(transaction.amount, transaction.decimals).toString(),
      poolAddress: assetAddress,
      repayWithATokens: false,
      debtType: transaction.debtType,
    });

    repayTransactions.push({
      ...transaction,
      isHidden: false,
      action: 'repay',
      tx: repayTx,
    });

    get().addToBatch(repayTransactions);
  },
  // TODO: get gas limit from multicall contract
  getGasLimit: () => {
    const gasLimitInWei = get().batchTransactionGroups.flat().reduce(
      (acc, action) => acc.add(action.tx?.gasLimit || ethers.BigNumber.from(0)),
      ethers.BigNumber.from(0)
    );
    return ethers.utils.formatUnits(gasLimitInWei);
  },
  getBatchTx: async () => {
    const user = get().account;
    const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, multicallAbi, get().signer);

    // Flatten all transactions from all groups
    const allTransactions = get()
      .batchTransactionGroups.flat()
      .filter((t) => !['approve', 'delegate'].includes(t.action));

    const actions = allTransactions
      .map((t) => t.tx)
      .map((tx) => ({
        target: tx.to,
        allowFailure: false,
        value: tx.value || ethers.BigNumber.from(0),
        callData: tx.data,
        gasLimit: tx.gasLimit || ethers.BigNumber.from(0),
      }));

    if (actions.length === 0) {
      throw new Error('No valid actions to execute');
    }

    console.log('Multicall actions:', actions);

    const totalValue = actions.reduce(
      (acc, action) => acc.add(action.value || ethers.BigNumber.from(0)),
      ethers.BigNumber.from(0)
    );
    const totalGasLimit = actions.reduce(
      (acc, action) => acc.add(action.gasLimit || ethers.BigNumber.from(0)),
      ethers.BigNumber.from(0)
    );
    console.log('totalValue', totalValue, totalValue.toString());
    console.log('totalGasLimit', totalGasLimit, totalGasLimit.toString());

    const tx = multicallContract.interface.encodeFunctionData('aggregate3Value', [actions]);
    return {
      data: tx,
      to: MULTICALL_ADDRESS,
      from: user,
      value: totalValue,
      // gasLimit: ethers.BigNumber.from(5000000000),
      gasLimit: totalGasLimit,
    };
  },
});
