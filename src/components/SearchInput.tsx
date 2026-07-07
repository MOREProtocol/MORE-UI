import { SearchIcon } from '@heroicons/react/outline';
import { XCircleIcon } from '@heroicons/react/solid';
import { Box, IconButton, InputBase, SxProps, Theme, useMediaQuery, useTheme } from '@mui/material';
import debounce from 'lodash/debounce';
import { useMemo, useRef, useState } from 'react';

interface SearchInputProps {
  onSearchTermChange: (value: string) => void;
  wrapperSx?: SxProps<Theme>;
  placeholder: string;
  disableFocus?: boolean;
}

export const SearchInput = ({
  onSearchTermChange,
  wrapperSx,
  placeholder,
  disableFocus,
}: SearchInputProps) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { breakpoints } = useTheme();
  const sm = useMediaQuery(breakpoints.down('sm'));

  const handleClear = () => {
    setSearchTerm('');
    onSearchTermChange('');
    inputEl.current?.focus();
  };

  const debounchedChangeHandler = useMemo(() => {
    return debounce((value: string) => {
      onSearchTermChange(value);
    }, 300);
  }, [onSearchTermChange]);
  const boxSx: SxProps<Theme> = (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    bgcolor: 'background.paper',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '14px',
    height: '48px',
    ...(typeof wrapperSx === 'function'
      ? (wrapperSx(theme) as Record<string, unknown>)
      : (wrapperSx as Record<string, unknown>)),
  });

  return (
    <Box sx={boxSx}>
      <Box sx={{ ml: 2, mt: 1 }}>
        <SearchIcon height={16} />
      </Box>
      <InputBase
        autoFocus={sm}
        inputRef={inputEl}
        sx={{ width: '100%', fontSize: { xs: 16, sm: 14 } }}
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          debounchedChangeHandler(e.target.value);
        }}
        onKeyDown={(event) => {
          if (disableFocus) event.stopPropagation();
        }}
      />
      <IconButton
        sx={{ p: 0, mr: 2, visibility: searchTerm ? 'visible' : 'hidden' }}
        onClick={() => handleClear()}
      >
        <XCircleIcon height={16} />
      </IconButton>
    </Box>
  );
};
