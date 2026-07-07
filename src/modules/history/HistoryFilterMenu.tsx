import { XCircleIcon } from '@heroicons/react/solid';
import CheckIcon from '@mui/icons-material/Check';
import SortIcon from '@mui/icons-material/Sort';
import {
  Box,
  Button,
  Divider,
  Menu,
  MenuItem,
  SvgIcon,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { DarkTooltip } from 'src/components/infoTooltips/DarkTooltip';
import { useRootStore } from 'src/store/root';
import { TRANSACTION_HISTORY } from 'src/utils/mixPanelEvents';

import { FilterOptions } from './types';

interface HistoryFilterMenuProps {
  onFilterChange: (filter: FilterOptions[]) => void;
  currentFilter: FilterOptions[];
}

interface FilterLabelProps {
  filter: FilterOptions;
}

const FilterLabel: React.FC<FilterLabelProps> = ({ filter }) => {
  switch (filter) {
    case FilterOptions.SUPPLY:
      return 'Supply';
    case FilterOptions.BORROW:
      return 'Borrow';
    case FilterOptions.WITHDRAW:
      return 'Withdraw';
    case FilterOptions.REPAY:
      return 'Repay';
    case FilterOptions.RATECHANGE:
      return 'Rate change';
    case FilterOptions.COLLATERALCHANGE:
      return 'Collateral change';
    case FilterOptions.LIQUIDATION:
      return 'Liquidation';
  }
};

export const HistoryFilterMenu: React.FC<HistoryFilterMenuProps> = ({
  onFilterChange,
  currentFilter,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [localFilter, setLocalFilter] = useState<FilterOptions[]>(currentFilter);
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    onFilterChange(localFilter);
  }, [localFilter, onFilterChange]);

  const theme = useTheme();
  const downToMD = useMediaQuery(theme.breakpoints.down('md'));

  const allSelected = currentFilter.length === 0;

  // The primary filter pills (rendered by HistoryWrapper) already surface these four
  // types, so keep this control looking neutral ("More filters") when it merely mirrors
  // one of them — it should only light up for combinations/advanced types (rate change,
  // collateral change, liquidation) that aren't reachable from the primary pills.
  const PRIMARY_OPTIONS = [
    FilterOptions.SUPPLY,
    FilterOptions.BORROW,
    FilterOptions.WITHDRAW,
    FilterOptions.REPAY,
  ];
  const isPrimaryOnly = currentFilter.length === 1 && PRIMARY_OPTIONS.includes(currentFilter[0]);
  const showNeutral = allSelected || isPrimaryOnly;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    onFilterChange(currentFilter);
  };

  const handleFilterClick = (filter: FilterOptions | undefined) => {
    let newFilter: FilterOptions[] = [];
    if (filter !== undefined) {
      if (currentFilter.includes(filter)) {
        newFilter = currentFilter.filter((item) => item !== filter);
      } else {
        trackEvent(TRANSACTION_HISTORY.FILTER, { value: filter });
        newFilter = [...currentFilter, filter];
        // Checks if all filter options are selected,  enum length is divided by 2 based on how Typescript creates object from enum
        if (newFilter.length === Object.keys(FilterOptions).length / 2) {
          newFilter = [];
        }
      }
    }

    setLocalFilter(newFilter);
  };

  const FilterButtonLabel = () => {
    if (allSelected) {
      return 'All transactions';
    } else {
      const displayLimit = 2;
      const hiddenCount = currentFilter.length - displayLimit;
      const displayedFilters = currentFilter.slice(0, displayLimit).map((filter) => (
        <React.Fragment key={filter}>
          <FilterLabel filter={filter} />
          {filter !== currentFilter[currentFilter.length - 1] && ','}
          {filter !== currentFilter[displayLimit - 1] && ' '}
        </React.Fragment>
      ));

      return (
        <Box sx={{ display: 'flex' }}>
          <Typography variant="description" color={theme.palette.primary.main} sx={{ mr: 1 }}>
            TXs:
          </Typography>
          {displayedFilters}
          {hiddenCount > 0 && <React.Fragment>...(+{hiddenCount})</React.Fragment>}
        </Box>
      );
    }
  };

  const handleClearFilter = (event: React.MouseEvent) => {
    trackEvent(TRANSACTION_HISTORY.FILTER, { value: 'cleared' });
    event.stopPropagation();
    setLocalFilter([]);
  };

  return (
    <Box>
      <Button
        size="small"
        sx={{
          minWidth: 'unset',
          maxWidth: downToMD ? '100%' : 280,
          display: 'inline-flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 36,
          minHeight: 36,
          border: '1px solid',
          borderColor: showNeutral ? 'transparent' : 'divider',
          borderRadius: '9999px',
          bgcolor: showNeutral ? 'background.surface' : 'background.paper',
          color: 'text.secondary',
          textTransform: 'none',
          '&:hover': { bgcolor: 'background.surface' },
          px: '14px',
          gap: '6px',
        }}
        onClick={handleClick}
      >
        <Box display="flex" alignItems="center" overflow="hidden" gap={0.75}>
          <SvgIcon sx={{ fontSize: 14 }} color={showNeutral ? 'inherit' : 'primary'}>
            <SortIcon />
          </SvgIcon>
          <Typography
            variant="secondary14"
            color={showNeutral ? 'text.secondary' : 'text.primary'}
            sx={{
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {showNeutral ? 'More filters' : <FilterButtonLabel />}
          </Typography>
        </Box>
        {!showNeutral && (
          <DarkTooltip
            title={
              <Typography variant="caption" color="common.white">
                Reset
              </Typography>
            }
          >
            <Box
              sx={{
                cursor: 'pointer',
                height: 'auto',
                width: 'auto',
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
                '&:hover': { color: 'text.primary' },
              }}
              onClick={handleClearFilter}
            >
              <XCircleIcon width={16} height={16} />
            </Box>
          </DarkTooltip>
        )}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 280,
            maxHeight: 300,
            mt: 1,
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <MenuItem
          onClick={() => handleFilterClick(undefined)}
          sx={{
            background: allSelected ? theme.palette.background.surface : undefined,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="subheader1" color="text.primary">
            All transactions
          </Typography>
          {allSelected && (
            <SvgIcon sx={{ fontSize: '16px' }}>
              <CheckIcon />
            </SvgIcon>
          )}
        </MenuItem>
        <Divider sx={{ mt: 1 }} />
        <Box
          sx={{
            overflowY: 'scroll',
            maxHeight: 200,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          {Object.keys(FilterOptions)
            .filter((key) => isNaN(Number(key)))
            .map((optionKey) => {
              const option = FilterOptions[optionKey as keyof typeof FilterOptions];
              return (
                <MenuItem
                  key={optionKey}
                  onClick={() => handleFilterClick(option)}
                  sx={{
                    background: currentFilter.includes(option)
                      ? theme.palette.background.surface
                      : undefined,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="subheader1" color="text.primary">
                    <FilterLabel filter={option} />
                  </Typography>
                  {currentFilter.includes(option) && (
                    <SvgIcon sx={{ fontSize: '16px' }}>
                      <CheckIcon />
                    </SvgIcon>
                  )}
                </MenuItem>
              );
            })}
        </Box>
      </Menu>
    </Box>
  );
};
