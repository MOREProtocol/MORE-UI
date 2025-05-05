import React from 'react';
import { ModalContextType, ModalType, useModalContext } from 'src/hooks/useModal';

import { BasicModal } from '../../primitives/BasicModal';
import { ModalWrapper } from '../FlowCommons/ModalWrapper';
import { FaucetModalContent } from './FaucetModalContent';

export const FaucetModal = () => {
  const { type, close, args } = useModalContext() as ModalContextType<{
    underlyingAsset: string;
  }>;

  return (
    <BasicModal open={type === ModalType.Faucet} setOpen={close}>
      <ModalWrapper title={<>{'Faucet'}</>} underlyingAsset={args.underlyingAsset}>
        {(params) => <FaucetModalContent {...params} />}
      </ModalWrapper>
    </BasicModal>
  );
};
