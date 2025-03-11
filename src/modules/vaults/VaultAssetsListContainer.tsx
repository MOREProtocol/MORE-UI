import { ListWrapper } from 'src/components/lists/ListWrapper';

import { VaultAssetsList } from './VaultAssetsList';

export const VaultAssetsListContainer = () => {
  return (
    <ListWrapper titleComponent={<></>}>
      <VaultAssetsList />
    </ListWrapper>
  );
};
