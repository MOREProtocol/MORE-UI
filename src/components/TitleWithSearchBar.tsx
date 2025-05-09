import { FilterIcon, SearchIcon } from '@heroicons/react/solid';
import {
  Box,
  Button,
  IconButton,
  SvgIcon,
  Typography,
  TypographyProps,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ReactNode, useState } from 'react';

import { SearchInput } from './SearchInput';

interface TitleWithSearchBarProps<C extends React.ElementType> {
  onSearchTermChange: (value: string) => void;
  searchPlaceholder: string;
  titleProps?: TypographyProps<C, { component?: C }>;
  title: ReactNode;
  onShowFilterChange?: (value: boolean) => void;
  showFilter?: boolean;
}

export const TitleWithSearchBar = <T extends React.ElementType>({
  onSearchTermChange,
  searchPlaceholder,
  titleProps,
  title,
  onShowFilterChange,
  showFilter,
}: TitleWithSearchBarProps<T>) => {
  const [showSearchBar, setShowSearchBar] = useState(false);

  const { breakpoints } = useTheme();
  const sm = useMediaQuery(breakpoints.down('sm'));

  const showSearchIcon = sm && !showSearchBar;
  const showMarketTitle = !sm || !showSearchBar;

  const handleCancelClick = () => {
    setShowSearchBar(false);
    onSearchTermChange('');
  };

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {showMarketTitle && (
          <Typography component="div" variant="h2" sx={{ mr: 4 }} {...titleProps}>
            {title}
          </Typography>
        )}
        {onShowFilterChange && (
          <IconButton disableRipple onClick={() => onShowFilterChange(!showFilter)}>
            <SvgIcon sx={{ fontSize: '20px', color: showFilter ? 'text.primary' : '#A5A8B6' }}>
              <FilterIcon />
            </SvgIcon>
          </IconButton>
        )}
      </Box>
      <Box
        sx={{
          height: '40px',
          width: showSearchBar && sm ? '100%' : 'unset',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {showSearchIcon && (
          <IconButton onClick={() => setShowSearchBar(true)}>
            <SvgIcon>
              <SearchIcon />
            </SvgIcon>
          </IconButton>
        )}
        {(showSearchBar || !sm) && (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <SearchInput
              wrapperSx={{
                width: {
                  xs: '100%',
                  sm: '340px',
                },
              }}
              placeholder={searchPlaceholder}
              onSearchTermChange={onSearchTermChange}
            />
            {sm && (
              <Button sx={{ ml: 2 }} onClick={() => handleCancelClick()}>
                <Typography variant="buttonM">
                  Cancel
                </Typography>
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
