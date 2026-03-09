import { StateCreator } from 'zustand';
import { RootStore } from './root';

export type OmniRequestStatus = 'pending' | 'ready-to-execute' | 'completed' | 'refunded';

export interface OmniRequest {
  guid: string;
  vaultId: string;
  chainId: number;
  type: 'deposit' | 'redeem';
  status: OmniRequestStatus;
  txHash: string;
  vaultName?: string;
  timestamp: number;
}

export type OmniRequestSlice = {
  omniRequests: Record<string, OmniRequest>;
  addOmniRequest: (req: Omit<OmniRequest, 'timestamp'>) => void;
  updateOmniRequestStatus: (guid: string, status: OmniRequestStatus) => void;
  removeOmniRequest: (guid: string) => void;
};

export const createOmniRequestSlice: StateCreator<
  RootStore,
  [['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  OmniRequestSlice
> = (set) => ({
  omniRequests: {},

  addOmniRequest: (req) => {
    set((state) => ({
      omniRequests: {
        ...state.omniRequests,
        [req.guid]: { ...req, timestamp: Date.now() },
      },
    }));
  },

  updateOmniRequestStatus: (guid, status) => {
    set((state) => {
      const existing = state.omniRequests[guid];
      if (!existing) return state;
      return {
        omniRequests: {
          ...state.omniRequests,
          [guid]: { ...existing, status },
        },
      };
    });
  },

  removeOmniRequest: (guid) => {
    set((state) => {
      const next = { ...state.omniRequests };
      delete next[guid];
      return { omniRequests: next };
    });
  },
});
