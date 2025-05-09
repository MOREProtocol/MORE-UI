import { ChainId, InterestRate, Stake } from '@aave/contract-helpers';
import { createContext, useContext, useState } from 'react';
import { EmodeModalType } from 'src/components/transactions/Emode/EmodeModalContent';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { TxErrorType } from 'src/ui-config/errorMapping';
import { GENERAL } from 'src/utils/mixPanelEvents';
import { IProps } from 'src/helpers/types';

export enum ModalType {
  Welcome,
  Supply,
  Withdraw,
  Borrow,
  Repay,
  CollateralChange,
  RateSwitch,
  Stake,
  Unstake,
  StakeCooldown,
  StakeRewardClaim,
  ClaimRewards,
  Emode,
  Faucet,
  Swap,
  DebtSwitch,
  GovDelegation,
  GovVote,
  V3Migration,
  RevokeGovDelegation,
  StakeRewardsClaimRestake,
  Switch,
  StakingMigrate,
  GovRepresentatives,
}

export interface ModalArgsType {
  underlyingAsset?: string;
  support?: boolean;
  power?: string;
  icon?: string;
  stakeAssetName?: Stake;
  currentRateMode?: InterestRate;
  emode?: EmodeModalType;
  isFrozen?: boolean;
  representatives?: Array<{ chainId: ChainId; representative: string }>;
  chainId?: number;
}

export type TxStateType = {
  txHash?: string;
  // txError?: string;
  loading?: boolean;
  success?: boolean;
};

type CallbackFn = () => void;

export interface ModalContextType<T extends ModalArgsType> {
  openSupply: (
    underlyingAsset: string,
    currentMarket: string,
    name: string,
    funnel: string,
    isReserve?: boolean
  ) => void;
  openWithdraw: (
    underlyingAsset: string,
    currentMarket: string,
    name: string,
    funnel: string
  ) => void;
  openBorrow: (
    underlyingAsset: string,
    currentMarket: string,
    name: string,
    funnel: string,
    isReserve?: boolean
  ) => void;
  openRepay: (
    underlyingAsset: string,
    currentRateMode: InterestRate,
    isFrozen: boolean,
    currentMarket: string,
    name: string,
    funnel: string
  ) => void;
  openCollateralChange: (
    underlyingAsset: string,
    currentMarket: string,
    name: string,
    funnel: string,
    usageAsCollateralEnabledOnUser: boolean
  ) => void;
  openRateSwitch: (underlyingAsset: string, currentRateMode: InterestRate) => void;
  openStake: (stakeAssetName: Stake, icon: string) => void;
  openUnstake: (stakeAssetName: Stake, icon: string) => void;
  openStakeCooldown: (stakeAssetName: Stake, icon: string) => void;
  openStakeRewardsClaim: (stakeAssetName: Stake, icon: string) => void;
  openStakeRewardsRestakeClaim: (stakeAssetName: Stake, icon: string) => void;
  openClaimRewards: () => void;
  openEmode: (mode: EmodeModalType) => void;
  openFaucet: (underlyingAsset: string) => void;
  openSwap: (underlyingAsset: string) => void;
  openDebtSwitch: (underlyingAsset: string, currentRateMode: InterestRate) => void;
  openGovDelegation: () => void;
  openRevokeGovDelegation: () => void;
  openV3Migration: () => void;
  openSwitch: (underlyingAsset?: string, chainId?: number) => void;
  openStakingMigrate: () => void;
  openGovRepresentatives: (
    representatives: Array<{ chainId: ChainId; representative: string }>
  ) => void;
  close: () => void;
  closeWithCb: (callback: CallbackFn) => void;
  type?: ModalType;
  args: T;
  mainTxState: TxStateType;
  approvalTxState: TxStateType;
  setApprovalTxState: (data: TxStateType) => void;
  setMainTxState: (data: TxStateType) => void;
  gasLimit: string;
  setGasLimit: (limit: string) => void;
  loadingTxns: boolean;
  setLoadingTxns: (loading: boolean) => void;
  txError: TxErrorType | undefined;
  setTxError: (error: TxErrorType | undefined) => void;
}

export const ModalContext = createContext<ModalContextType<ModalArgsType>>(
  {} as ModalContextType<ModalArgsType>
);

export const ModalContextProvider: React.FC<IProps> = ({ children }) => {
  const { setSwitchNetworkError } = useWeb3Context();
  // contains the current modal open state if any
  const [type, setType] = useState<ModalType>();
  // contains arbitrary key-value pairs as a modal context
  const [args, setArgs] = useState<ModalArgsType>({});
  const [approvalTxState, setApprovalTxState] = useState<TxStateType>({});
  const [mainTxState, setMainTxState] = useState<TxStateType>({});
  const [gasLimit, setGasLimit] = useState<string>('');
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [txError, setTxError] = useState<TxErrorType>();
  const trackEvent = useRootStore((store) => store.trackEvent);

  return (
    <ModalContext.Provider
      value={{
        openSupply: (underlyingAsset, currentMarket, name, funnel, isReserve) => {
          setType(ModalType.Supply);
          setArgs({ underlyingAsset });

          if (isReserve) {
            trackEvent(GENERAL.OPEN_MODAL, {
              modal: 'Supply',
              market: currentMarket,
              assetName: name,
              asset: underlyingAsset,
              funnel,
            });
          } else {
            trackEvent(GENERAL.OPEN_MODAL, {
              modal: 'Supply',
              market: currentMarket,
              assetName: name,
              asset: underlyingAsset,
              funnel,
            });
          }
        },
        openWithdraw: (underlyingAsset, currentMarket, name, funnel) => {
          setType(ModalType.Withdraw);
          setArgs({ underlyingAsset });

          trackEvent(GENERAL.OPEN_MODAL, {
            modal: 'Withdraw',
            market: currentMarket,
            assetName: name,
            asset: underlyingAsset,
            funnel: funnel,
          });
        },
        openBorrow: (underlyingAsset, currentMarket, name, funnel, isReserve) => {
          setType(ModalType.Borrow);
          setArgs({ underlyingAsset });
          if (isReserve) {
            trackEvent(GENERAL.OPEN_MODAL, {
              modal: 'Borrow',
              market: currentMarket,
              assetName: name,
              asset: underlyingAsset,
              funnel,
            });
          } else {
            trackEvent(GENERAL.OPEN_MODAL, {
              modal: 'Borrow',
              market: currentMarket,
              assetName: name,
              asset: underlyingAsset,
              funnel,
            });
          }
        },
        openRepay: (underlyingAsset, currentRateMode, isFrozen, currentMarket, name, funnel) => {
          setType(ModalType.Repay);
          setArgs({ underlyingAsset, currentRateMode, isFrozen });

          trackEvent(GENERAL.OPEN_MODAL, {
            modal: 'Repay',
            asset: underlyingAsset,
            assetName: name,
            market: currentMarket,
            funnel,
          });
        },
        openCollateralChange: (
          underlyingAsset,
          currentMarket,
          name,
          funnel,
          usageAsCollateralEnabledOnUser
        ) => {
          setType(ModalType.CollateralChange);
          setArgs({ underlyingAsset });
          trackEvent(GENERAL.OPEN_MODAL, {
            modal: 'Toggle Collateral',
            market: currentMarket,
            assetName: name,
            asset: underlyingAsset,
            usageAsCollateralEnabledOnUser: usageAsCollateralEnabledOnUser,
            funnel,
          });
        },
        openRateSwitch: (underlyingAsset, currentRateMode) => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Rate Switch' });
          setType(ModalType.RateSwitch);
          setArgs({ underlyingAsset, currentRateMode });
        },
        openStake: (stakeAssetName, icon) => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Stake', assetName: stakeAssetName });
          setType(ModalType.Stake);
          setArgs({ stakeAssetName, icon });
        },
        openUnstake: (stakeAssetName, icon) => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Untake', assetName: stakeAssetName });
          setType(ModalType.Unstake);
          setArgs({ stakeAssetName, icon });
        },
        openStakeCooldown: (stakeAssetName, icon) => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Cooldown', assetName: stakeAssetName });
          setType(ModalType.StakeCooldown);
          setArgs({ stakeAssetName, icon });
        },
        openStakeRewardsClaim: (stakeAssetName, icon) => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Stake Rewards', assetName: stakeAssetName });
          setType(ModalType.StakeRewardClaim);
          setArgs({ stakeAssetName, icon });
        },
        openStakeRewardsRestakeClaim: (stakeAssetName, icon) => {
          trackEvent(GENERAL.OPEN_MODAL, {
            modal: 'Restatke Stake Rewards',
            assetName: stakeAssetName,
          });
          setType(ModalType.StakeRewardsClaimRestake);
          setArgs({ stakeAssetName, icon });
        },
        openClaimRewards: () => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Claim' });
          setType(ModalType.ClaimRewards);
        },
        openEmode: (mode) => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'eMode' });
          setType(ModalType.Emode);
          setArgs({ emode: mode });
        },
        openFaucet: (underlyingAsset) => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Faucet' });
          setType(ModalType.Faucet);
          setArgs({ underlyingAsset });
        },
        openSwap: (underlyingAsset) => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Swap' });
          setType(ModalType.Swap);
          setArgs({ underlyingAsset });
        },
        openDebtSwitch: (underlyingAsset, currentRateMode) => {
          trackEvent(GENERAL.OPEN_MODAL, {
            modal: 'Debt Switch',
            asset: underlyingAsset,
          });
          setType(ModalType.DebtSwitch);
          setArgs({ underlyingAsset, currentRateMode });
        },
        openGovDelegation: () => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Governance Delegation' });
          setType(ModalType.GovDelegation);
        },
        openRevokeGovDelegation: () => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Revoke Governance Delegation' });
          setType(ModalType.RevokeGovDelegation);
        },
        openGovRepresentatives: (representatives) => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Representatives' });
          setType(ModalType.GovRepresentatives);
          setArgs({ representatives });
        },
        openV3Migration: () => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'V2->V3 Migration' });
          setType(ModalType.V3Migration);
        },
        openSwitch: (underlyingAsset, chainId) => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Switch' });
          setType(ModalType.Switch);
          setArgs({ underlyingAsset, chainId });
        },
        openStakingMigrate: () => {
          trackEvent(GENERAL.OPEN_MODAL, { modal: 'Staking V1->V2 Migration' });
          setType(ModalType.StakingMigrate);
        },
        close: () => {
          setType(undefined);
          setArgs({});
          setMainTxState({});
          setApprovalTxState({});
          setGasLimit('');
          setTxError(undefined);
          setSwitchNetworkError(undefined);
        },
        closeWithCb: (callback) => {
          close();
          callback();
        },
        type,
        args,
        approvalTxState,
        mainTxState,
        setApprovalTxState,
        setMainTxState,
        gasLimit,
        setGasLimit,
        loadingTxns,
        setLoadingTxns,
        txError,
        setTxError,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModalContext = () => {
  const context = useContext(ModalContext);

  if (context === undefined) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }

  return context;
};
