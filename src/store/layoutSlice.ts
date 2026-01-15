import { StateCreator } from 'zustand';

import { RootStore } from './root';

export type LayoutSlice = {
  setMobileDrawerOpen: (eventName: boolean) => void;
  mobileDrawerOpen: boolean;
  feedbackDialogOpen: boolean;
  setFeedbackOpen: (eventName: boolean) => void;
  compactNumbers?: boolean;
  setCompactNumbers: (value?: boolean) => void;
};

export const createLayoutSlice: StateCreator<
  RootStore,
  [['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  LayoutSlice
> = (set) => {
  return {
    mobileDrawerOpen: false,
    feedbackDialogOpen: false,
    compactNumbers: undefined,
    setMobileDrawerOpen: (value: boolean) => {
      set({ mobileDrawerOpen: value });
    },
    setFeedbackOpen: (value: boolean) => {
      set({ feedbackDialogOpen: value });
    },
    setCompactNumbers: (value?: boolean) => {
      set({ compactNumbers: value });
    },
  };
};
