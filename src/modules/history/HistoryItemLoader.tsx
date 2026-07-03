import { Box, Skeleton } from '@mui/material';

import { TRANSACTION_ROW_GRID_TEMPLATE } from './TransactionRowItem';

const HistoryRowSkeleton = () => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: TRANSACTION_ROW_GRID_TEMPLATE,
        alignItems: 'center',
        columnGap: 2,
        px: 4,
        py: 2.5,
        '&:not(:last-of-type)': {
          borderBottom: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Skeleton variant="rounded" width={84} height={22} sx={{ borderRadius: '9999px' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Skeleton variant="circular" width={22} height={22} />
        <Skeleton width={100} height={16} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
        <Skeleton width={100} height={16} />
        <Skeleton width={64} height={12} />
      </Box>
      <Skeleton width={48} height={12} sx={{ ml: 'auto' }} />
      <Skeleton variant="circular" width={20} height={20} sx={{ ml: 'auto' }} />
    </Box>
  );
};

export const HistoryItemLoader = () => {
  return (
    <>
      <HistoryRowSkeleton />
      <HistoryRowSkeleton />
      <HistoryRowSkeleton />
      <HistoryRowSkeleton />
    </>
  );
};
